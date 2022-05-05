import type { ReportLog, ReportUnit } from "./lib";

export type Reporter = (report: ReportLog | ReportUnit) => unknown;
