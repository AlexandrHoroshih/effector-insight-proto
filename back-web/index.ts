import type { Domain, Scope } from "effector";

import type { Show } from "./lib";
import { type Subscription, createSubscription } from "./subscription";
import {
  type Reporter,
  type CoordinatorConfig,
  defaultReporter,
} from "./reporter";
import { createUnitReporter } from "./report-unit";
import { type Timer, createLogReporter, defaultTimer } from "./report-log";

function attachInsight(
  domain: Domain,
  config?: {
    scope?: Scope;
    coordinator?: Show<CoordinatorConfig>;
    reporter?: Show<Reporter>;
    timer?: Show<Timer>;
  }
): Subscription {
  if (!domain) {
    throw new Error("Must have domain!!");
  }

  const {
    scope,
    coordinator = {
      port: 5000,
    },
    reporter = defaultReporter,
    timer = defaultTimer,
  } = config ?? {};

  console.log("TRACKING", domain.shortName);

  const [attachLog, destroy] = createLogReporter(
    reporter,
    timer,
    coordinator,
    scope
  );
  const reportUnit = createUnitReporter(reporter, coordinator);

  domain.onCreateStore(reportUnit);
  domain.onCreateEvent(reportUnit);
  domain.onCreateEffect(reportUnit);

  domain.onCreateStore(attachLog);
  domain.onCreateEvent(attachLog);
  domain.onCreateEffect(attachLog);

  return createSubscription(() => {
    console.log("STOPPED TRACKING", domain.shortName);
    destroy();
  });
}

export { attachInsight };
