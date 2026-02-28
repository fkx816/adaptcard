import { nanoid } from "nanoid";
import type { SubmitAnswer } from "../types.js";
import { createReviewLog } from "../models/review-log.js";
import { getGeneratedCard } from "../models/generated-card.js";
import { getKnowledgePointById, updateKnowledgePointReview } from "../models/knowledge-point.js";
import { masteryToRating, scheduleAfterReview } from "./fsrs-service.js";

export function scoreAnswers(cardId: string, answers: SubmitAnswer[]): {
  total: number;
  correct: number;
  correctRate: number;
  rating: number;
  nextDueAt: string;
} {
  const card = getGeneratedCard(cardId);
  if (!card) {
    throw new Error("Generated card not found");
  }

  const payload = JSON.parse(card.payload) as { questions: Array<{ id: string; answer: string }> };
  const answerMap = new Map(answers.map((x) => [x.questionId, normalize(x.userAnswer)]));

  const total = payload.questions.length;
  const correct = payload.questions.filter((q) => normalize(q.answer) === answerMap.get(q.id)).length;
  const correctRate = total > 0 ? correct / total : 0;
  const rating = masteryToRating(correctRate);
  const kp = getKnowledgePointById(card.knowledge_point_id);
  if (!kp) {
    throw new Error("Knowledge point missing");
  }

  const now = new Date();
  const scheduled = scheduleAfterReview(kp, rating, now);

  updateKnowledgePointReview({
    id: kp.id,
    due_at: scheduled.due.toISOString(),
    stability: scheduled.stability,
    difficulty: scheduled.difficulty,
    elapsed_days: scheduled.elapsed_days,
    scheduled_days: scheduled.scheduled_days,
    reps: scheduled.reps,
    lapses: scheduled.lapses,
    state: scheduled.state,
    last_review: now.toISOString(),
    updated_at: now.toISOString()
  });

  createReviewLog({
    id: nanoid(12),
    knowledge_point_id: kp.id,
    card_id: card.id,
    reviewed_at: now.toISOString(),
    rating,
    correct_rate: correctRate,
    detail: JSON.stringify({ answers })
  });

  return {
    total,
    correct,
    correctRate,
    rating,
    nextDueAt: scheduled.due.toISOString()
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
