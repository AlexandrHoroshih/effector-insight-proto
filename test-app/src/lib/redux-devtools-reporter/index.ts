import { Reporter, ReportUnit, ReportLog } from "@effector/insight-back-web";
import { set } from "./dset";

const reduxDevTools =
  // @ts-ignore
  typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__;

const unitMap: Record<string, ReportUnit> = {};
const getParentsList = (p: string[]) =>
  p.map((sid) => unitMap[sid]?.name).join(", ");

export const createReduxDevtoolsReporter = (config: {
  instanceId: string;
}): Reporter => {
  const rootState: Record<string, unknown> = {};
  function setState(name: string, value: any): void {
    set(rootState, name.replace(/\//g, "."), value);
  }

  function eventCalled(log: ReportLog): void {
    if (reduxDevTools) {
      const unit = unitMap[log.sid];
      reduxDevTools.send(
        {
          type: `${unit.name} (event, triggered by ${getParentsList(
            log.parentSid
          )}))`,
          payload: log.payload,
        },
        rootState,
        config
      );
    }
  }

  function storeAdded(log: ReportUnit): void {
    setState(log.name, log.defaultState);
  }

  function storeUpdated(log: ReportLog): void {
    const unit = unitMap[log.sid];

    setState(unit.name, log.payload);

    if (reduxDevTools) {
      reduxDevTools.send(
        {
          type: `${unit.name} (store updated, triggered by ${getParentsList(
            log.parentSid
          )}))`,
          value: log.payload,
        },
        rootState,
        config
      );
    }
  }
  function effectCalled(log: ReportLog): void {
    if (reduxDevTools) {
      const unit = unitMap[log.sid];
      console.log(log, unitMap);
      reduxDevTools.send(
        {
          type: `${unit.name} (effect called, triggered by ${getParentsList(
            log.parentSid
          )})`,
          params: log.payload,
        },
        rootState,
        config
      );
    }
  }

  return (log) => {
    if (log.type === "unit") {
      unitMap[log.sid] = log;
      storeAdded(log);
    } else if (log.type === "log") {
      const unit = unitMap[log.sid];

      if (!unit) {
        console.error("unknown unit", log);
        return;
      }

      if (unit.kind === "event") {
        eventCalled(log);
      } else if (unit.kind === "store") {
        storeUpdated(log);
      } else if (unit.kind === "effect") {
        effectCalled(log);
      }
    }
  };
};
