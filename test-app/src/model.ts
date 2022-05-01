import { createDomain, sample } from "effector";
import { reset, every } from "patronum";

const root = createDomain();

export const clicked = root.createEvent();
export const $count = root.createStore(0).on(clicked, (s) => s + 1);

export const $anotherCount = root.createStore(0);

const syncFx = root.createEffect((s: unknown) => s);
const asyncFx = root.createEffect(async (ms: number) => {
  await new Promise((r) => setTimeout(r, ms));
});

sample({
  clock: $count,
  target: [syncFx, asyncFx.prepend(() => 100)],
});

sample({
  source: $anotherCount,
  clock: asyncFx.done,
  fn: (s) => s - 1,
  target: $anotherCount,
});

sample({
  clock: $anotherCount,
  filter: every({
    stores: [
      $anotherCount.map((c) => c > -10),
      asyncFx.inFlight.map((c) => c < 2),
    ],
    predicate: true,
  }),
  target: asyncFx.prepend(() => 100),
});

reset({
  clock: sample({
    clock: asyncFx.done,
    filter: $anotherCount.map((c) => c >= -10),
  }),
  target: $anotherCount,
});
