import type { Domain, Scope } from "effector";

import type { Show, ReportLog, ReportUnit } from "./lib";
import { type Subscription, createSubscription } from "./subscription";
import { type Reporter } from "./reporter";
import { createUnitReporter } from "./report-unit";
import { type Timer, createLogReporter, defaultTimer } from "./report-log";

function attachInsight(
  domain: Domain,
  config: {
    scope?: Scope;
    reporter: Show<Reporter>;
    timer?: Show<Timer>;
  }
): Subscription {
  if (!domain) {
    throw new Error("Must have domain!!");
  }

  const { scope, reporter, timer = defaultTimer } = config ?? {};

  console.log("TRACKING", domain.shortName);

  const [attachLog, destroy] = createLogReporter(reporter, timer, scope);
  const reportUnit = createUnitReporter(reporter);

  const unsubs = [
    domain.onCreateStore(reportUnit),
    domain.onCreateEvent(reportUnit),
    domain.onCreateEffect(reportUnit),

    domain.onCreateStore(attachLog),
    domain.onCreateEvent(attachLog),
    domain.onCreateEffect(attachLog),
  ];

  return createSubscription(() => {
    console.log("STOPPED TRACKING", domain.shortName);
    unsubs.forEach((cb) => cb());
    destroy();
  });
}

export { attachInsight };

export type { Reporter, ReportLog, ReportUnit, Timer };
