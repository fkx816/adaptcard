import { db } from "../db/client.js";

export type KnowledgePointRow = {
  id: string;
  front: string;
  back: string;
  context: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
};

const insertStmt = db.prepare(`
  INSERT INTO knowledge_points (
    id, front, back, context, tags, created_at, updated_at, due_at,
    stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review
  ) VALUES (
    @id, @front, @back, @context, @tags, @created_at, @updated_at, @due_at,
    @stability, @difficulty, @elapsed_days, @scheduled_days, @reps, @lapses, @state, @last_review
  )
`);

const updateReviewStmt = db.prepare(`
  UPDATE knowledge_points
  SET due_at=@due_at,
      stability=@stability,
      difficulty=@difficulty,
      elapsed_days=@elapsed_days,
      scheduled_days=@scheduled_days,
      reps=@reps,
      lapses=@lapses,
      state=@state,
      last_review=@last_review,
      updated_at=@updated_at
  WHERE id=@id
`);

export function createKnowledgePoint(row: KnowledgePointRow): void {
  insertStmt.run(row);
}

export function getKnowledgePointById(id: string): KnowledgePointRow | undefined {
  return db.prepare("SELECT * FROM knowledge_points WHERE id = ?").get(id) as KnowledgePointRow | undefined;
}

export function getNextDueKnowledgePoint(nowIso: string): KnowledgePointRow | undefined {
  return db
    .prepare("SELECT * FROM knowledge_points WHERE due_at <= ? ORDER BY due_at ASC LIMIT 1")
    .get(nowIso) as KnowledgePointRow | undefined;
}

export function listKnowledgePoints(limit: number): KnowledgePointRow[] {
  return db
    .prepare("SELECT * FROM knowledge_points ORDER BY due_at ASC LIMIT ?")
    .all(limit) as KnowledgePointRow[];
}

export function updateKnowledgePointReview(row: Omit<KnowledgePointRow, "front" | "back" | "context" | "tags" | "created_at">): void {
  updateReviewStmt.run(row);
}
