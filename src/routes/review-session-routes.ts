import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../errors.js";
import { db } from "../db/client.js";
import { deleteReviewLogById, getLatestReviewLogForSession } from "../models/review-log.js";
import {
  createReviewSession,
  decrementReviewSessionProgress,
  finishReviewSession,
  getReviewSessionById
} from "../models/review-session.js";
import { getSessionAccuracy } from "../services/review-session-metrics.js";
import { updateKnowledgePointReview } from "../models/knowledge-point.js";

const startSchema = z.object({
  startedAt: z.string().datetime().optional()
});

const finishSchema = z.object({
  endedAt: z.string().datetime().optional()
});

const reviewLogDetailSchema = z.object({
  stats: z.object({
    total: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative()
  }),
  knowledgePointBefore: z.object({
    dueAt: z.string().datetime(),
    stability: z.number(),
    difficulty: z.number(),
    elapsedDays: z.number().int().nonnegative(),
    scheduledDays: z.number().int().nonnegative(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    state: z.number().int().nonnegative(),
    lastReview: z.string().datetime().nullable(),
    updatedAt: z.string().datetime()
  })
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

  app.post("/review-sessions/:id/undo-last-review", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const session = getReviewSessionById(params.id);
    if (!session) {
      throw new AppError(404, "REVIEW_SESSION_NOT_FOUND", "Review session not found");
    }
    if (session.ended_at) {
      throw new AppError(409, "REVIEW_SESSION_ALREADY_FINISHED", "Review session already finished");
    }

    const log = getLatestReviewLogForSession(params.id);
    if (!log) {
      throw new AppError(404, "REVIEW_LOG_NOT_FOUND", "No review log found for this session");
    }

    let parsedDetail: unknown;
    try {
      parsedDetail = JSON.parse(log.detail);
    } catch {
      throw new AppError(409, "UNDO_NOT_AVAILABLE", "Undo is not available for this review log");
    }

    const parsed = reviewLogDetailSchema.safeParse(parsedDetail);
    if (!parsed.success) {
      throw new AppError(409, "UNDO_NOT_AVAILABLE", "Undo is not available for this review log");
    }

    const detail = parsed.data;
    const nowIso = new Date().toISOString();

    const tx = db.transaction(() => {
      updateKnowledgePointReview({
        id: log.knowledge_point_id,
        due_at: detail.knowledgePointBefore.dueAt,
        stability: detail.knowledgePointBefore.stability,
        difficulty: detail.knowledgePointBefore.difficulty,
        elapsed_days: detail.knowledgePointBefore.elapsedDays,
        scheduled_days: detail.knowledgePointBefore.scheduledDays,
        reps: detail.knowledgePointBefore.reps,
        lapses: detail.knowledgePointBefore.lapses,
        state: detail.knowledgePointBefore.state,
        last_review: detail.knowledgePointBefore.lastReview,
        updated_at: nowIso
      });

      deleteReviewLogById(log.id);

      decrementReviewSessionProgress({
        id: params.id,
        reviewed_count: 1,
        correct_count: detail.stats.correct,
        updated_at: nowIso
      });
    });

    tx();

    const updated = getReviewSessionById(params.id);
    const accuracy = getSessionAccuracy(updated?.reviewed_count ?? 0, updated?.correct_count ?? 0);

    return {
      undoneReview: {
        reviewLogId: log.id,
        cardId: log.card_id,
        reviewedAt: log.reviewed_at,
        rating: log.rating,
        correctRate: log.correct_rate
      },
      session: {
        id: params.id,
        startedAt: updated?.started_at ?? session.started_at,
        endedAt: updated?.ended_at ?? session.ended_at,
        reviewedCount: updated?.reviewed_count ?? session.reviewed_count,
        correctCount: updated?.correct_count ?? session.correct_count,
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
