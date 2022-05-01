import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.post("/units", function (request, reply) {
  fastify.log.debug(request.body);
  reply.send({ got: "unit" });
});

fastify.post("/logs", function (request, reply) {
  fastify.log.debug(request.body);
  reply.send({ got: "logs" });
});

fastify.listen(5003, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server is now listening on ${address}`);
});
