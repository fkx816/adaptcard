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

const sessionScopeSchema = z.object({
  deckId: z.string().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  state: z.enum(["new", "learning", "review", "relearning", "suspended"]).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional()
});

const startSchema = z.object({
  startedAt: z.string().datetime().optional(),
  scope: sessionScopeSchema.optional()
});

const finishSchema = z.object({
  endedAt: z.string().datetime().optional()
});

const queueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
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

function parseSessionScope(scopeRaw: string | null | undefined): z.infer<typeof sessionScopeSchema> | null {
  if (!scopeRaw) {
    return null;
  }

  const parsed = JSON.parse(scopeRaw);
  return sessionScopeSchema.parse(parsed);
}

function buildQueueWhere(scope: z.infer<typeof sessionScopeSchema> | null): { whereClause: string; params: string[] } {
  if (!scope) {
    return { whereClause: "", params: [] };
  }

  const whereParts: string[] = [];
  const params: string[] = [];

  if (scope.deckId) {
    whereParts.push("c.deck_id = ?");
    params.push(scope.deckId);
  }

  if (scope.state) {
    whereParts.push("c.state = ?");
    params.push(scope.state);
  }

  if (scope.dueBefore) {
    whereParts.push("c.due_at <= ?");
    params.push(scope.dueBefore);
  }

  if (scope.dueAfter) {
    whereParts.push("c.due_at >= ?");
    params.push(scope.dueAfter);
  }

  if (scope.tags && scope.tags.length > 0) {
    for (const tag of scope.tags) {
      whereParts.push("n.tags LIKE ?");
      params.push(`%${tag}%`);
    }
  }

  if (whereParts.length === 0) {
    return { whereClause: "", params };
  }

  return {
    whereClause: `WHERE ${whereParts.join(" AND ")}`,
    params
  };
}

function getSessionWorkloadSummary(scope: z.infer<typeof sessionScopeSchema> | null): {
  totalCount: number;
  dueCount: number;
  overdueCount: number;
} {
  const { whereClause, params: whereParams } = buildQueueWhere(scope);
  const nowIso = new Date().toISOString();

  const row = db
    .prepare(
      `SELECT
          COUNT(*) as totalCount,
          SUM(CASE WHEN c.due_at <= ? THEN 1 ELSE 0 END) as dueCount,
          SUM(CASE WHEN c.due_at < ? THEN 1 ELSE 0 END) as overdueCount
       FROM cards c
       INNER JOIN notes n ON n.id = c.note_id
       ${whereClause}`
    )
    .get(nowIso, nowIso, ...whereParams);

  const typedRow = row as { totalCount: number; dueCount: number | null; overdueCount: number | null };
  return {
    totalCount: typedRow.totalCount,
    dueCount: typedRow.dueCount ?? 0,
    overdueCount: typedRow.overdueCount ?? 0
  };
}


export async function registerReviewSessionRoutes(app: FastifyInstance): Promise<void> {
  app.post("/review-sessions/start", async (request, reply) => {
    const body = startSchema.parse(request.body ?? {});
    const nowIso = new Date().toISOString();
    const startedAt = body.startedAt ?? nowIso;
    const id = nanoid(12);
    const scope = body.scope ?? null;

    createReviewSession({
      id,
      started_at: startedAt,
      ended_at: null,
      reviewed_count: 0,
      correct_count: 0,
      session_scope_json: scope ? JSON.stringify(scope) : null,
      created_at: nowIso,
      updated_at: nowIso
    });

    reply.code(201).send({
      sessionId: id,
      startedAt,
      scope
    });
  });

  app.get("/review-sessions/:id", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const session = getReviewSessionById(params.id);
    if (!session) {
      throw new AppError(404, "REVIEW_SESSION_NOT_FOUND", "Review session not found");
    }

    const accuracy = getSessionAccuracy(session.reviewed_count, session.correct_count);
    const scope = parseSessionScope(session.session_scope_json);
    const workload = getSessionWorkloadSummary(scope);
    return {
      session: {
        id: session.id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        reviewedCount: session.reviewed_count,
        correctCount: session.correct_count,
        accuracy,
        scope,
        queueSummary: {
          totalCount: workload.totalCount,
          dueCount: workload.dueCount,
          overdueCount: workload.overdueCount
        }
      }
    };
  });

  app.get("/review-sessions/:id/queue", async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const query = queueQuerySchema.parse(request.query ?? {});
    const session = getReviewSessionById(params.id);
    if (!session) {
      throw new AppError(404, "REVIEW_SESSION_NOT_FOUND", "Review session not found");
    }

    const scope = parseSessionScope(session.session_scope_json);
    const { whereClause, params: whereParams } = buildQueueWhere(scope);

    const items = db
      .prepare(
        `SELECT c.id, c.note_id, c.deck_id, c.card_type, c.state, c.due_at, c.reps, c.lapses, c.created_at, c.updated_at,
                n.front, n.back, n.tags
         FROM cards c
         INNER JOIN notes n ON n.id = c.note_id
         ${whereClause}
         ORDER BY c.due_at ASC
         LIMIT ? OFFSET ?`
      )
      .all(...whereParams, query.limit, query.offset) as Array<{
      id: string;
      note_id: string;
      deck_id: string;
      card_type: string;
      state: string;
      due_at: string;
      reps: number;
      lapses: number;
      created_at: string;
      updated_at: string;
      front: string;
      back: string;
      tags: string;
    }>;

    const total = db
      .prepare(
        `SELECT COUNT(*) as count
         FROM cards c
         INNER JOIN notes n ON n.id = c.note_id
         ${whereClause}`
      )
      .get(...whereParams) as { count: number };

    return {
      sessionId: params.id,
      scope,
      items: items.map((card) => ({
        id: card.id,
        noteId: card.note_id,
        deckId: card.deck_id,
        cardType: card.card_type,
        state: card.state,
        dueAt: card.due_at,
        reps: card.reps,
        lapses: card.lapses,
        front: card.front,
        back: card.back,
        tags: JSON.parse(card.tags) as string[],
        createdAt: card.created_at,
        updatedAt: card.updated_at
      })),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: total.count
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
