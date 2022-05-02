import type { Store, Event, Effect } from "effector";
import type { ReportUnit } from "./lib";
import type { Reporter, CoordinatorConfig } from "./reporter";
import { getSid } from "./lib";

export const createUnitReporter =
  (report: Reporter, config: CoordinatorConfig) =>
  async (unit: Store<any> | Event<any> | Effect<any, any, any>) => {
    await report(
      {
        type: "units",
        body: [readUnitReport(unit)],
      },
      config
    );
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
    sid: getSid(unit),
    name: unit.shortName,
    file: loc.file,
    column: loc.column,
    line: loc.line,
    kind: unit.kind as ReportUnit["kind"],
  };
};
