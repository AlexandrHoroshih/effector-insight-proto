import type { Store, Event, Effect } from "effector";
import { nanoid } from "nanoid/non-secure";

export const getSid = (unit: Store<any> | Event<any> | Effect<any, any, any>) =>
  unit.sid ?? `unknown_${unit.kind}_${(unit as any)?.id}`;

export const getId = () => nanoid(6);
