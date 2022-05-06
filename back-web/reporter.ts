import type { ReportLog, ReportUnit, TraceEndLog } from "./lib";

export type Reporter = (
  report: ReportLog | ReportUnit | TraceEndLog
) => unknown;
