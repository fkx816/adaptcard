import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerKnowledgePointRoutes } from "./routes/knowledge-point-routes.js";
import { registerQuizRoutes } from "./routes/quiz-routes.js";
import { registerReviewSessionRoutes } from "./routes/review-session-routes.js";
import { registerDeckRoutes } from "./routes/deck-routes.js";
import { registerNoteRoutes } from "./routes/note-routes.js";
import { registerCardRoutes } from "./routes/card-routes.js";
import { AppError } from "./errors.js";

export async function buildApp(): Promise<FastifyInstance> {
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
  await app.register(registerReviewSessionRoutes);
  await app.register(registerDeckRoutes);
  await app.register(registerNoteRoutes);
  await app.register(registerCardRoutes);

  return app;
}
