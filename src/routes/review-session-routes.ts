import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../errors.js";
import { createReviewSession, finishReviewSession, getReviewSessionById } from "../models/review-session.js";
import { getSessionAccuracy } from "../services/review-session-metrics.js";

const startSchema = z.object({
  startedAt: z.string().datetime().optional()
});

const finishSchema = z.object({
  endedAt: z.string().datetime().optional()
});

export async function registerReviewSessionRoutes(app: FastifyInstance): Promise<void> {
  app.post("/review-sessions/start", async (request, reply) => {
    const body = startSchema.parse(request.body ?? {});
    const nowIso = new Date().toISOString();
    const startedAt = body.startedAt ?? nowIso;
    const id = nanoid(12);

    createReviewSession({
      id,
      started_at: startedAt,
      ended_at: null,
      reviewed_count: 0,
      correct_count: 0,
      created_at: nowIso,
      updated_at: nowIso
    });

    reply.code(201).send({
      sessionId: id,
      startedAt
    });
  });

  app.get("/review-sessions/:id", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const session = getReviewSessionById(params.id);
    if (!session) {
      throw new AppError(404, "REVIEW_SESSION_NOT_FOUND", "Review session not found");
    }

    const accuracy = getSessionAccuracy(session.reviewed_count, session.correct_count);
    return {
      session: {
        id: session.id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        reviewedCount: session.reviewed_count,
        correctCount: session.correct_count,
        accuracy
      }
    };
  });

  app.post("/review-sessions/:id/finish", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = finishSchema.parse(request.body ?? {});
    const session = getReviewSessionById(params.id);
    if (!session) {
      throw new AppError(404, "REVIEW_SESSION_NOT_FOUND", "Review session not found");
    }
    if (session.ended_at) {
      throw new AppError(409, "REVIEW_SESSION_ALREADY_FINISHED", "Review session already finished");
    }

    const endedAt = body.endedAt ?? new Date().toISOString();
    finishReviewSession({
      id: params.id,
      ended_at: endedAt,
      updated_at: endedAt
    });

    const updated = getReviewSessionById(params.id);
    return {
      session: {
        id: params.id,
        startedAt: updated?.started_at ?? session.started_at,
        endedAt,
        reviewedCount: updated?.reviewed_count ?? session.reviewed_count,
        correctCount: updated?.correct_count ?? session.correct_count
      }
    };
  });
}
