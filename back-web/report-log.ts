import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./lib";
import type { Reporter, CoordinatorConfig } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId } from "./lib";

export const defaultTimer = performance.now;
export type Timer = typeof defaultTimer;

let traceId: TraceId;
let chunkId: ChunkId;
const traceEffectsCount: Record<TraceId, number> = {};

export const createLogReporter = (
  report: Reporter,
  timer: Timer,
  config: CoordinatorConfig,
  scope?: Scope
) => {
  const destroyers: (() => void)[] = [];

  const attachLogReporter = async (
    unit: Store<any> | Event<any> | Effect<any, any, any>
  ) => {
    if (is.event(unit) || is.effect(unit)) {
      const originalCreate = (unit as any).create;
      (unit as any).create = (...args) => {
        const localChunkdId = chunkId;
        const localTraceId = traceId;

        if (!localTraceId) {
          traceId = getId();
        }
        if (!localChunkdId) {
          chunkId = getId();
        }
        originalCreate(...args);
        if (!localChunkdId) {
          chunkId = null;
        }
        if (!localTraceId) {
          const count = traceEffectsCount[traceId];
          if (count === 0) {
            report(
              {
                type: "logs",
                body: [{ traceId, traceEnd: true }],
              },
              config
            );
            delete traceEffectsCount[traceId];
          }
          traceId = null;
        }
      };
    }

    // add logger
    destroyers.push(
      createWatch({
        unit,
        scope,
        fn: (payload) => {
          const log: ReportLog = {
            payload,
            time: timer(),
            sid: getSid(unit),
            traceId,
            chunkId,
          };

          report(
            {
              type: "logs",
              body: [log],
            },
            config
          );
        },
      })
    );

    if (is.effect(unit)) {
      // traceId and count for effect
      destroyers.push(
        createWatch({
          unit,
          scope,
          fn: () => {
            traceEffectsCount[traceId] = traceEffectsCount[traceId] + 1;
          },
        })
      );
      const traceSaveStep = step.compute({
        fn(data) {
          const { req } = data;
          req._insight_.traceId = traceId;
          return data;
        },
      });
      ((unit as any).graphite as Node).seq.push(traceSaveStep);
      destroyers.push(() => {
        const idx = ((unit as any).graphite as Node).seq.findIndex(
          (v) => v === traceSaveStep
        );
        ((unit as any).graphite as Node).seq.splice(idx, 1);
      });

      const anyway = unit.finally;

      attachLogReporter(anyway);

      // traceId and count from effect's finally
      destroyers.push(
        createWatch({
          unit: anyway,
          scope,
          fn: () => {
            traceEffectsCount[traceId] = traceEffectsCount[traceId] - 1;
          },
        })
      );
      const traceReInstallStep = step.compute({
        fn(data) {
          const { req } = data;
          const prevTraceId = req._insight_.traceId;

          traceId = prevTraceId;

          return data;
        },
      });
      ((anyway as any).graphite as Node).seq.unshift(traceReInstallStep);
      destroyers.push(() => {
        const idx = ((anyway as any).graphite as Node).seq.findIndex(
          (v) => v === traceReInstallStep
        );
        ((anyway as any).graphite as Node).seq.splice(idx, 1);
      });
    }
  };

  const destroy = () => {
    destroyers.forEach((cb) => cb());
  };

  return [attachLogReporter, destroy] as const;
};
