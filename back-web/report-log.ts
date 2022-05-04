import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./lib";
import type { Reporter, CoordinatorConfig } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId } from "./lib";

export const defaultTimer = performance.now;
export type Timer = typeof defaultTimer;

let traceId: TraceId | null;
let chunkId: ChunkId | null;
const clearChunkId = () => {
  chunkId = null;
};
const traceEffectsCount: Record<TraceId, number> = {};

const withTrace =
  (handler: (...args: any[]) => any) =>
  (...args: any[]) => {
    const localId = traceId;
    const reInstallId = () => {
      traceId = localId;
    };
    try {
      const result = handler(args);

      // if result is promise, then function is async, need to reinstall trace id when its finished
      if (typeof result?.then === "function") {
        result.then(reInstallId, reInstallId);
      }
      // if result is not promise, then function is sync and trace id will be kept anyway

      return result;
    } catch (error) {
      throw error;
    }
  };

export const createLogReporter = (
  report: Reporter,
  timer: Timer,
  config: CoordinatorConfig,
  scope?: Scope
) => {
  const destroyers: (() => void)[] = [];

  const setupIdStep = step.compute({
    fn(data, __, stack) {
      if (scope === stack.scope) {
        // no chunk-id == first launched unit in the task
        if (!chunkId) {
          chunkId = getId();
          queueMicrotask(clearChunkId);
        }

        if (!traceId) {
          traceId = getId();
          traceEffectsCount[traceId] = 0;
          const localId = traceId;
          queueMicrotask(() => {
            traceId = null;
            if (traceEffectsCount[localId] === 0) {
              delete traceEffectsCount[localId];
              report(
                {
                  type: "logs",
                  body: [
                    {
                      traceId: localId,
                      traceEnd: true,
                    },
                  ],
                },
                config
              );
            }
          });
        }
      }

      return data;
    },
  });

  // for fx runners
  const fxSaveTraceIdStep = step.compute({
    fn(data) {
      const baseHandler = data.handler;

      data.handler = withTrace(baseHandler);

      return data;
    },
  });

  const attachLogReporter = async (
    unit: Store<any> | Event<any> | Effect<any, any, any>
  ) => {
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

      // inject traceId-saver to keep between effects
      (
        (fx as unknown as { graphite: Node }).graphite.scope.runner
          .seq as Node["seq"]
      ).splice(1, 0, fxSaveTraceIdStep);

      attachLogReporter(anyway);

      // traceId and count from effect's finally
      destroyers.push(
        createWatch({
          unit: anyway,
          scope,
          fn: () => {
            traceEffectsCount[traceId] = traceEffectsCount[traceId] - 1;
            const localId = traceId;
            queueMicrotask(() => {
              traceId = null;
              if (traceEffectsCount[localId] === 0) {
                delete traceEffectsCount[localId];
                report(
                  {
                    type: "logs",
                    body: [
                      {
                        traceId: localId,
                        traceEnd: true,
                      },
                    ],
                  },
                  config
                );
              }
            });
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
