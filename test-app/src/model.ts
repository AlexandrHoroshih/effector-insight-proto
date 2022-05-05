import { createDomain, sample, fork } from "effector";

import { attachInsight } from "@effector/insight-back-web";

const root = createDomain();

export const scope = fork();

const unitsMap = new Map<string, any>();

attachInsight(root, {
  scope,
  reporter: async (log, config) => {
    if (log.type === "units") {
      const unit = log.body[0];
      unitsMap.set(unit.sid, unit);
    }
    console.log(
      log.type,
      log.body[0],
      unitsMap.get((log.body[0] as any)?.sid!)?.name
    );
  },
  timer: Date.now,
});

export const clicked = root.createEvent();
export const $count = root.createStore(0).on(clicked, (s) => s + 1);

export const $anotherCount = root.createStore(0);

const A = root.createEvent<number>();
const AA = A.map((x) => x);
const B = root.createEvent<number>();
const C = root.createEvent<number>();
const D = root.createEvent<number>();
const E = root.createEffect((x: number) => x);
const F = root.createEvent<number>();
const G = root.createEvent<number>();

sample({
  source: $count,
  clock: clicked,
  fn: (c) => {
    return -1 * c;
  },
  target: A,
});

sample({
  clock: A,
  target: [B, C],
});
sample({
  clock: [AA, C],
  target: E,
});
sample({
  clock: B,
  target: D,
});
sample({
  clock: D,
  target: F,
});
sample({
  clock: [E.doneData, F],
  target: G,
});
sample({
  clock: G,
  target: $anotherCount,
});
