import type { Domain } from "effector";

type Subscription = {
  (): void;
  unsubscribe(): void;
};

const createSubscription = (cb: () => void): Subscription => {
  const unsub = () => cb();
  unsub.unsubscribe = unsub;

  return unsub;
};

function attachInsight(
  domain: Domain,
  config?: {
    coordinator?: {
      port?: number;
    };
  }
): Subscription {
  if (!domain) {
    throw new Error("Must have domain!!");
  }

  console.log("TRACKING", domain.shortName, domain);

  return createSubscription(() => {
    console.log("STOPPED TRACKING", domain.shortName)
  })
}

export { attachInsight };
