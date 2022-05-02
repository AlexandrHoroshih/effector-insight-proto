import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./lib";
import type { Reporter, CoordinatorConfig } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId } from "./lib";

export const defaultTimer = performance.now;
export type Timer = typeof defaultTimer;

let traceId: TraceId;
let chunkId: ChunkId;

let fallbackId = 0;
const getTraceId = () =>
  (traceId ?? "unknown_trace_" + fallbackId++) as TraceId;
const getChunkId = () =>
  (chunkId ?? "unknown_chunk_" + fallbackId++) as ChunkId;

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
    ((unit as any).graphite as Node).seq.unshift(
      step.compute({
        fn(_, __, stack) {
          if (!traceId) {
            traceId = getId();
          }
          if (!chunkId) {
            chunkId = getId();
          }
        },
      })
    );

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
            traceId: getTraceId(),
            chunkId: getChunkId(),
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
      attachLogReporter(unit.finally);
    }
  };

  const destroy = () => {
    destroyers.forEach((cb) => cb());
  };

  return [attachLogReporter, destroy] as const;
};
