import type { ReportLog, ReportUnit } from "./lib";

export type Reporter = typeof defaultReporter;

export type CoordinatorConfig = {
  port?: number;
};

export const defaultReporter = async (
  report:
    | { type: "logs"; body: ReportLog[] }
    | {
        type: "units";
        body: ReportUnit[];
      },
  config?: CoordinatorConfig
) => {
  const port = config?.port ?? 5000;
  const { type, body } = report;

  await fetch(`http://localhost:${port}/${type}`, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
};
