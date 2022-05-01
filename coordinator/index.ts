import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.post("/units", function (request, reply) {
  const reportedUnit = JSON.parse(request.body as string) as ReportUnit;

  console.log(reportedUnit);

  fastify.log.warn(`UNIT: ${reportedUnit.name}, ${reportedUnit.file}`);
  reply.send({ got: "unit" });
});

fastify.post("/logs", function (request, reply) {
  //   fastify.log.debug(request.body);
  reply.send({ got: "logs" });
});

fastify.listen(5003, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server is now listening on ${address}`);
});

type TraceId = string;
type ChunkId = string;

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
