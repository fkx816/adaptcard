import { db } from "../db/client.js";

export type ReviewSessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  reviewed_count: number;
  correct_count: number;
  created_at: string;
  updated_at: string;
};

const insertStmt = db.prepare(`
  INSERT INTO review_sessions (
    id, started_at, ended_at, reviewed_count, correct_count, created_at, updated_at
  ) VALUES (
    @id, @started_at, @ended_at, @reviewed_count, @correct_count, @created_at, @updated_at
  )
`);

const bumpProgressStmt = db.prepare(`
  UPDATE review_sessions
  SET reviewed_count = reviewed_count + @reviewed_count,
      correct_count = correct_count + @correct_count,
      updated_at = @updated_at
  WHERE id = @id AND ended_at IS NULL
`);

const finishStmt = db.prepare(`
  UPDATE review_sessions
  SET ended_at = @ended_at,
      updated_at = @updated_at
  WHERE id = @id AND ended_at IS NULL
`);

const decrementProgressStmt = db.prepare(`
  UPDATE review_sessions
  SET reviewed_count = MAX(0, reviewed_count - @reviewed_count),
      correct_count = MAX(0, correct_count - @correct_count),
      updated_at = @updated_at
  WHERE id = @id AND ended_at IS NULL
`);

export function createReviewSession(row: ReviewSessionRow): void {
  insertStmt.run(row);
}

export function getReviewSessionById(id: string): ReviewSessionRow | undefined {
  return db.prepare("SELECT * FROM review_sessions WHERE id = ?").get(id) as ReviewSessionRow | undefined;
}

export function bumpReviewSessionProgress(input: {
  id: string;
  reviewed_count: number;
  correct_count: number;
  updated_at: string;
}): number {
  const result = bumpProgressStmt.run(input);
  return result.changes;
}

export function finishReviewSession(input: { id: string; ended_at: string; updated_at: string }): number {
  const result = finishStmt.run(input);
  return result.changes;
}

export function decrementReviewSessionProgress(input: {
  id: string;
  reviewed_count: number;
  correct_count: number;
  updated_at: string;
}): number {
  const result = decrementProgressStmt.run(input);
  return result.changes;
}
