import { createDomain, sample, fork } from "effector";

import { attachInsight } from "@effector/insight-back-web";

import { createReduxDevtoolsReporter } from "./lib/redux-devtools-reporter";

const root = createDomain();

export const scope = fork();

const unitsMap = new Map<string, any>();

// attachInsight(root, {
//   scope,
//   reporter: async (log) => {
//     if (log.type === "unit") {
//       const unit = log;
//       unitsMap.set(unit.sid, unit);
//     }
//     console.log(log.type, log, unitsMap.get((log as any)?.sid)?.name);
//   },
//   timer: Date.now,
// });

attachInsight(root, {
  scope,
  reporter: createReduxDevtoolsReporter({ instanceId: "test-app" }),
});

export const clicked = root.createEvent();
export const $count = root.createStore(0).on(clicked, (s) => s + 1);

export const $anotherCount = root.createStore(0);

const A = root.createEvent<number>();
const AA = A.map((x) => x);
const B = root.createEvent<number>();
const C = root.createEvent<number>();
const D = root.createEvent<number>();
const eFx = root.createEffect((x: number) => {
  // await new Promise((r) => setTimeout(r, 100));
  return x;
});
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
  target: eFx,
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
  clock: [eFx.doneData, F],
  target: G,
});
sample({
  clock: G,
  target: $anotherCount,
});

$anotherCount.watch(console.log);
