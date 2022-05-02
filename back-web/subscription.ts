export type Subscription = {
  (): void;
  unsubscribe(): void;
};

export const createSubscription = (cb: () => void): Subscription => {
  const unsub = () => cb();
  unsub.unsubscribe = unsub;

  return unsub;
};
