import type { Domain, Scope, Store, Event, Effect, Unit } from "effector";
import { nanoid } from "nanoid/non-secure";
import { createWatch } from "effector";

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

  const { reportLog, reportUnit } = createReporters(reporter, coordinator);

  domain.onCreateStore(reportUnit);
  domain.onCreateEvent(reportUnit);
  domain.onCreateEffect(reportUnit);

  return createSubscription(() => {
    console.log("STOPPED TRACKING", domain.shortName);
  });
}

export { attachInsight };

type Subscription = {
  (): void;
  unsubscribe(): void;
};

const createSubscription = (cb: () => void): Subscription => {
  const unsub = () => cb();
  unsub.unsubscribe = unsub;

  return unsub;
};

type CoordinatorConfig = {
  port?: number;
};

const defaultTimer = performance.now;
type Timer = typeof defaultTimer;

type TraceId = string;
const getTraceId = (): TraceId => nanoid(6);

type ChunkId = string;
const getChunkId = (): ChunkId => nanoid(6);

// Reporter
type ReportLog = {
  traceId: TraceId;
  chunkId: ChunkId;
  sid: string;
  payload: unknown;
  time: number;
};

type ReportUnit = {
  sid: string | null;
  name: string;
  file?: string;
  column?: number;
  line?: number;
  kind: "store" | "event" | "effect";
};

type Reporter = typeof defaultReporter;

const defaultReporter = async (
  report:
    | { type: "logs"; body: ReportLog[] }
    | {
        type: "units";
        body: ReportUnit[];
      },
  config?: CoordinatorConfig
) => {
  const port = config?.port ?? 5000;
  const { type, body } = report;

  await fetch(`http://localhost:${port}/${type}`, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const createReporters = (report: Reporter, config: CoordinatorConfig) => {
  const reportUnit = async (
    unit: Store<any> | Event<any> | Effect<any, any, any>
  ) => {
    await report(
      {
        type: "units",
        body: [readUnitReport(unit)],
      },
      config
    );
  };
  const reportLog = async (log: ReportLog) => {
    await report(
      {
        type: "logs",
        body: [log],
      },
      config
    );
  };

  return {
    reportUnit,
    reportLog,
  };
};

type Loc = {
  file: string;
  column: number;
  line: number;
};

const readUnitReport = (
  unit: Store<any> | Event<any> | Effect<any, any, any>
): ReportUnit => {
  const loc = ((unit as any)?.defaultConfig?.loc as Loc) ?? ({} as Loc);

  if (["domain", "scope"].includes(unit.kind)) {
    throw Error("Invalid report");
  }

  return {
    sid: unit.sid,
    name: unit.shortName,
    file: loc.file,
    column: loc.column,
    line: loc.line,
    kind: unit.kind as ReportUnit["kind"],
  };
};

// helper types
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
type Show<A extends any> = A extends BuiltInObject
  ? A
  : A extends UnitObject
  ? A
  : {
      [K in keyof A]: A[K];
    }; // & {}
