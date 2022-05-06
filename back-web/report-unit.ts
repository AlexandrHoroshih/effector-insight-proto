import type { Store, Event, Effect } from "effector";
import { is } from "effector";
import type { ReportUnit } from "./lib";
import type { Reporter } from "./reporter";
import { getSid } from "./lib";

export const createUnitReporter = (report: Reporter) => {
  const unitReporter = (
    unit: Store<any> | Event<any> | Effect<any, any, any>
  ) => {
    report(readUnitReport(unit));
    if (is.effect(unit)) {
      report(
        readUnitReport(unit.finally, { name: `${unit.shortName}|finally` })
      );
      report(readUnitReport(unit.done, { name: `${unit.shortName}|done` }));
      report(readUnitReport(unit.fail, { name: `${unit.shortName}|fail` }));
      report(
        readUnitReport(unit.doneData, { name: `${unit.shortName}|doneData` })
      );
      report(
        readUnitReport(unit.failData, { name: `${unit.shortName}|failData` })
      );
      report(
        readUnitReport(unit.inFlight, { name: `${unit.shortName}|inFlight` })
      );
      report(
        readUnitReport(unit.pending, { name: `${unit.shortName}|pending` })
      );
    }
  };

  return unitReporter;
};

type Loc = {
  file: string;
  column: number;
  line: number;
};

const readUnitReport = (
  unit: Store<any> | Event<any> | Effect<any, any, any>,
  overrides?: Partial<ReportUnit>
): ReportUnit => {
  const loc = ((unit as any)?.defaultConfig?.loc as Loc) ?? ({} as Loc);

  if (["domain", "scope"].includes(unit.kind)) {
    throw Error("Invalid report");
  }

  return {
    type: "unit",
    sid: getSid(unit),
    name: unit.shortName,
    file: loc.file,
    column: loc.column,
    line: loc.line,
    kind: unit.kind as ReportUnit["kind"],
    defaultState: (unit as Store<unknown>)?.defaultState,
    ...overrides,
  };
};
