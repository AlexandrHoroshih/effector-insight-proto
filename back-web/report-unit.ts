import type { Store, Event, Effect } from "effector";
import type { ReportUnit } from "./lib";
import type { Reporter } from "./reporter";
import { getSid } from "./lib";

export const createUnitReporter =
  (report: Reporter) =>
  async (unit: Store<any> | Event<any> | Effect<any, any, any>) => {
    await report(readUnitReport(unit));
  };

type Loc = {
  file: string;
  column: number;
  line: number;
};

const readUnitReport = (
  unit: Store<any> | Event<any> | Effect<any, any, any>
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
  };
};
