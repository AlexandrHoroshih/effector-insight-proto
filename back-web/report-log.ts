import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./lib";
import type { Reporter, CoordinatorConfig } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId } from "./lib";

export const defaultTimer = performance.now;
export type Timer = typeof defaultTimer;

let traceId: TraceId | null;
let chunkId: ChunkId | null;
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
    const setupIdStep = step.compute({
      fn(data, __, stack) {
        if (scope === stack.scope) {
          if (!chunkId) {
            chunkId = getId();
            queueMicrotask(() => {
              chunkId = null;
            });
          }
        }

        return data;
      },
    });

    ((unit as any).graphite as Node).seq.unshift(setupIdStep);

    destroyers.push(() => {
      const idx = ((unit as any).graphite as Node).seq.findIndex(
        (v) => v === setupIdStep
      );
      ((unit as any).graphite as Node).seq.splice(idx, 1);
    });

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
      const fx = unit;
      destroyers.push(
        createWatch({
          unit: fx,
          scope,
          fn: () => {
            traceEffectsCount[traceId] = traceEffectsCount[traceId] + 1;
          },
        })
      );

      const anyway = fx.finally;

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
    }
  };

  const destroy = () => {
    destroyers.forEach((cb) => cb());
  };

  return [attachLogReporter, destroy] as const;
};
