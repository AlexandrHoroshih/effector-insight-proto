import type { Scope, Event, Store, Effect, Node } from "effector";
import type { TraceId, ChunkId, ReportLog } from "./types";
import type { Reporter, CoordinatorConfig } from "./reporter";

import { createWatch, is, step } from "effector";

import { getSid, getId } from "./lib";

export const defaultTimer = performance.now;
export type Timer = typeof defaultTimer;

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
        fn(_, _, stack) {
          stack.scope;
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
