import Fastify from "fastify";
import { ZodError } from "zod";
import { config } from "./config.js";
import { registerKnowledgePointRoutes } from "./routes/knowledge-point-routes.js";
import { registerQuizRoutes } from "./routes/quiz-routes.js";
import { AppError } from "./errors.js";

const app = Fastify({ logger: true });

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    });
    return;
  }

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null
      }
    });
    return;
  }

  request.log.error(error);
  reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error"
    }
  });
});

app.get("/health", async () => ({ ok: true, service: "adaptcard" }));

await app.register(registerKnowledgePointRoutes);
await app.register(registerQuizRoutes);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
