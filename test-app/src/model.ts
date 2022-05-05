import { createDomain, sample, fork } from "effector";
import { reset, every } from "patronum";

import { attachInsight } from "@effector/insight-back-web";

const root = createDomain();

export const scope = fork();

attachInsight(root, {
  scope,
  coordinator: {
    port: 5003,
  },
  reporter: async (log, config) => {
    console.log(log.type, log.body[0]);
  },
  timer: Date.now,
});

export const clicked = root.createEvent();
export const $count = root.createStore(0).on(clicked, (s) => s + 1);

export const $anotherCount = root.createStore(0);

const someEvent = root.createEvent();

const syncFx = root.createEffect((s: unknown) => s);
const asyncFx = root.createEffect(async (ms: number) => {
  await new Promise((r) => setTimeout(r, ms));
});

sample({
  clock: $count,
  target: [syncFx, asyncFx.prepend(() => 1_000)],
});

sample({
  source: $anotherCount,
  clock: asyncFx.done,
  fn: (s) => s - 1,
  target: $anotherCount,
});

asyncFx.done.watch(() => {
  someEvent();
});
