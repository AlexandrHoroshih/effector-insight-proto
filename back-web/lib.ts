import type { Store, Event, Effect, Unit, Stack, Node } from "effector";
import { nanoid } from "nanoid/non-secure";

export const getSid = (unit: Store<any> | Event<any> | Effect<any, any, any>) =>
  unit.sid ??
  getSidFromNode((unit as unknown as { graphite: Node }).graphite) ??
  `unknown_${unit.kind}_${(unit as any)?.id}`;

export const getName = (
  unit: Store<any> | Event<any> | Effect<any, any, any>
) => {
  const graphite = (unit as any).graphite as Node;

  return graphite.meta.name;
};

export const getId = () => nanoid(6);

type BuiltInObject =
  | Error
  | Date
  | RegExp
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | ArrayBuffer
  | DataView
  | Function
  | Promise<unknown>
  | Generator;

type UnitObject = Store<any> | Event<any> | Effect<any, any, any> | Unit<any>;

/**
 * Force typescript to print real type instead of geneic types
 *
 * It's better to see {a: string; b: number}
 * instead of GetCombinedValue<{a: Store<string>; b: Store<number>}>
 * */
export type Show<A extends any> = A extends BuiltInObject
  ? A
  : A extends UnitObject
  ? A
  : {
      [K in keyof A]: A[K];
    }; // & {}

export type TraceId = string;

export type ChunkId = string;

export type ReportLog = {
  type: "log";
  traceId: TraceId;
  chunkId: ChunkId;
  sid: string;
  payload: unknown;
  time: number;
  parentSid: string[];
};

export type TraceEndLog = {
  type: "traceEnd";
  traceId: TraceId;
  traceEnd: true;
};

export type ReportUnit = {
  type: "unit";
  sid: string;
  name: string;
  file?: string;
  column?: number;
  line?: number;
  kind: "store" | "event" | "effect";
  defaultState?: unknown;
};

const isSupportedUnit = (
  kind: string
): kind is "store" | "event" | "effect" => {
  return kind === "store" || kind === "event" || kind === "effect";
};

const mergeNameRegex = /merge\(.*\)/;
const isMergedTrigger = (meta: Record<string, string>) => {
  return Boolean(meta?.derived && meta?.name.match(mergeNameRegex));
};

export const findParentUnit = (stack: Stack): Stack | undefined => {
  let parent = stack.parent;

  if (
    parent &&
    (!isSupportedUnit(parent.node.meta.op) || isMergedTrigger(parent.node.meta))
  ) {
    return findParentUnit(parent);
  }

  return parent;
};

const isEffectChild = (node: Node) => {
  const { sid, named } = node.meta;
  return Boolean(
    !sid &&
      (named === "finally" ||
        named === "done" ||
        named === "doneData" ||
        named === "fail" ||
        named === "failData" ||
        named === "inFlight" ||
        named === "pending")
  );
};

export const getSidFromNode = (node: Node) => {
  const { meta } = node;

  if (isEffectChild(node)) {
    const parentEffect = node.family.owners.find((n) => n.meta.op === "effect");
    if (parentEffect) {
      return parentEffect.meta.sid + "|" + meta.named;
    }
  }

  return meta.sid;
};
