import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./lib";
import type { Reporter } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId, findParentUnit, getSidFromNode } from "./lib";

export const defaultTimer = Date.now;
export type Timer = typeof defaultTimer;

let directParentMap: Record<string, string[]> = {};
const setParent = (sid: string, parent: string) => {
  if (!directParentMap[sid]) {
    directParentMap[sid] = [];
  }
  directParentMap[sid].push(parent);
};
let traceId: TraceId | null;
let chunkId: ChunkId | null;
const clearChunkId = () => {
  chunkId = null;
  directParentMap = {};
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
  scope?: Scope
) => {
  const destroyers: (() => void)[] = [];

  const setupIdStep = step.compute({
    fn(data, __, stack) {
      if (scope === stack.scope) {
        console.log({
          unit: stack.node.meta,
          parent: findParentUnit(stack)?.node.meta,
          stack,
        });
        const parentUnit = findParentUnit(stack)?.node;
        if (parentUnit) {
          setParent(stack.node.meta.sid, getSidFromNode(parentUnit));
        }

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
              report({
                type: "log",
                traceId: localId,
                traceEnd: true,
              });
            }
          });
        }
      }

      return data;
    },
  });

  // for fx runners
  const fxSaveTraceIdStep = step.compute({
    fn(data, _, stack) {
      if (scope === stack.scope) {
        const baseHandler = data.handler;

        data.handler = withTrace(baseHandler);
      }

      return data;
    },
  });

  const attachLogReporter = async (
    unit: Store<any> | Event<any> | Effect<any, any, any>
  ) => {
    ((unit as any).graphite as Node).seq.unshift(setupIdStep);

    destroyers.push(() => {
      removeStep(((unit as any).graphite as Node).seq, setupIdStep);
    });

    // add logger
    destroyers.push(
      createWatch({
        unit,
        scope,
        fn: (payload) => {
          const sid = getSid(unit);
          const log: ReportLog = {
            type: "log",
            payload,
            time: timer(),
            sid,
            traceId: traceId ?? "unknown_trace",
            chunkId: chunkId ?? "unknown_chunk",
            parentSid: directParentMap[sid],
          };

          report(log);
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

      // inject traceId-saver to keep between effects
      const fxRunner = (fx as unknown as { graphite: Node }).graphite.scope
        .runner as Node;
      fxRunner.seq.splice(1, 0, fxSaveTraceIdStep); // must be put after step with handler resolving
      destroyers.push(() => {
        removeStep(fxRunner.seq, fxSaveTraceIdStep);
      });

      const anyway = fx.finally;

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
                report({
                  type: "log",
                  traceId: localId ?? "unknown_trace",
                  traceEnd: true,
                });
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

function removeStep(seq: Node["seq"], item: Node["seq"][number]) {
  const idx = seq.findIndex((i) => i === item);
  seq.splice(idx, 1);
}
