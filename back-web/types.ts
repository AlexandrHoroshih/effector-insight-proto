import type { Store, Effect, Event, Unit } from "effector";

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

export type ReportLog =
  | {
      traceId: TraceId;
      chunkId: ChunkId;
      sid: string;
      payload: unknown;
      time: number;
    }
  | {
      traceId: TraceId;
      traceEnd: true;
    };

export type ReportUnit = {
  sid: string;
  name: string;
  file?: string;
  column?: number;
  line?: number;
  kind: "store" | "event" | "effect";
};
