import * as FSRS from "ts-fsrs";
import type { KnowledgePointRow } from "../models/knowledge-point.js";

const params = (FSRS as any).generatorParameters
  ? (FSRS as any).generatorParameters({ enable_fuzz: false })
  : undefined;
const scheduler = (FSRS as any).fsrs(params);

type FSRSCard = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: Date;
};

function toCard(row: KnowledgePointRow): FSRSCard {
  return {
    due: new Date(row.due_at),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined
  };
}

export function initCard(now: Date): FSRSCard {
  const createEmptyCard = (FSRS as any).createEmptyCard;
  if (typeof createEmptyCard === "function") {
    return createEmptyCard(now);
  }
  return {
    due: now,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0
  };
}

export function scheduleAfterReview(row: KnowledgePointRow, rating: number, now: Date): FSRSCard {
  const result = scheduler.repeat(toCard(row), now);
  const pick = result[rating] ?? result[3] ?? result[1];
  return pick.card as FSRSCard;
}

export function masteryToRating(correctRate: number): number {
  if (correctRate >= 0.9) return 4;
  if (correctRate >= 0.7) return 3;
  if (correctRate >= 0.5) return 2;
  return 1;
}
