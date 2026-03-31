import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createKnowledgePoint, listKnowledgePoints, getNextDueKnowledgePoint, getKnowledgePointById } from "../models/knowledge-point.js";
import { listReviewLogsByKnowledgePoint } from "../models/review-log.js";
import { AppError } from "../errors.js";
import { initCard } from "../services/fsrs-service.js";

const createSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  context: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const knowledgePointIdParamSchema = z.object({
  id: z.string().min(1)
});

const reviewHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

export async function registerKnowledgePointRoutes(app: FastifyInstance): Promise<void> {
  app.post("/knowledge-points", async (request, reply) => {
    const body = createSchema.parse(request.body);
    const now = new Date();
    const card = initCard(now);

    const id = nanoid(12);
    createKnowledgePoint({
      id,
      front: body.front,
      back: body.back,
      context: body.context ?? null,
      tags: JSON.stringify(body.tags),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      due_at: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: null
    });

    reply.code(201).send({ id });
  });

  app.get("/knowledge-points", async (request) => {
    const query = z.object({ limit: z.coerce.number().min(1).max(200).default(50) }).parse(request.query);
    return {
      items: listKnowledgePoints(query.limit).map((row) => ({
        ...row,
        tags: JSON.parse(row.tags)
      }))
    };
  });

  app.get("/knowledge-points/:id/review-history", async (request) => {
    const params = knowledgePointIdParamSchema.parse(request.params ?? {});
    const query = reviewHistoryQuerySchema.parse(request.query ?? {});

    const knowledgePoint = getKnowledgePointById(params.id);
    if (!knowledgePoint) {
      throw new AppError(404, "KNOWLEDGE_POINT_NOT_FOUND", "Knowledge point not found");
    }

    const result = listReviewLogsByKnowledgePoint(params.id, query.limit, query.offset);

    return {
      knowledgePointId: params.id,
      items: result.items.map((row) => {
        const detail = JSON.parse(row.detail) as {
          answers?: Array<{ questionId: string; userAnswer: string }>;
          stats?: { total?: number; correct?: number };
        };

        return {
          id: row.id,
          sessionId: row.session_id,
          cardId: row.card_id,
          reviewedAt: row.reviewed_at,
          rating: row.rating,
          correctRate: row.correct_rate,
          stats: {
            total: detail.stats?.total ?? null,
            correct: detail.stats?.correct ?? null
          },
          answers: detail.answers ?? []
        };
      }),
      page: {
        limit: query.limit,
        offset: query.offset,
        total: result.total
      }
    };
  });

  app.get("/reviews/next", async () => {
    const row = getNextDueKnowledgePoint(new Date().toISOString());
    if (!row) {
      return { item: null };
    }

    return {
      item: {
        id: row.id,
        front: row.front,
        back: row.back,
        context: row.context,
        tags: JSON.parse(row.tags),
        dueAt: row.due_at,
        reps: row.reps,
        lapses: row.lapses
      }
    };
  });
}
