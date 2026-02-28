import { nanoid } from "nanoid";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getKnowledgePointById } from "../models/knowledge-point.js";
import { cleanupGeneratedCards, createGeneratedCard } from "../models/generated-card.js";
import { generateQuiz } from "../services/quiz-service.js";
import { scoreAnswers } from "../services/review-service.js";
import type { SubmitAnswer } from "../types.js";
import { AppError } from "../errors.js";

const generateSchema = z.object({
  knowledgePointId: z.string().min(1),
  count: z.number().min(1).max(10).default(3),
  pin: z.boolean().default(false)
});

const submitSchema = z.object({
  cardId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      userAnswer: z.string().min(1)
    })
  )
});

export async function registerQuizRoutes(app: FastifyInstance): Promise<void> {
  app.post("/quiz/generate", async (request, reply) => {
    const body = generateSchema.parse(request.body);
    const knowledgePoint = getKnowledgePointById(body.knowledgePointId);
    if (!knowledgePoint) {
      throw new AppError(404, "KNOWLEDGE_POINT_NOT_FOUND", "Knowledge point not found");
    }

    cleanupGeneratedCards(new Date().toISOString());

    const questions = await generateQuiz({
      front: knowledgePoint.front,
      back: knowledgePoint.back,
      context: knowledgePoint.context,
      count: body.count
    });

    const now = new Date();
    const expires = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const cardId = nanoid(12);

    createGeneratedCard({
      id: cardId,
      knowledge_point_id: knowledgePoint.id,
      generated_at: now.toISOString(),
      expires_at: expires.toISOString(),
      is_pinned: body.pin ? 1 : 0,
      payload: JSON.stringify({ questions })
    });

    reply.code(201).send({
      cardId,
      knowledgePointId: knowledgePoint.id,
      generatedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      questions
    });
  });

  app.post("/quiz/submit", async (request) => {
    const body = submitSchema.parse(request.body);
    const scored = scoreAnswers(body.cardId, body.answers as SubmitAnswer[]);
    return scored;
  });
}
