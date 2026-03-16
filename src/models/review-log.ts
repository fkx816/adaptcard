import { db } from "../db/client.js";

export type ReviewLogRow = {
  id: string;
  knowledge_point_id: string;
  card_id: string | null;
  session_id: string | null;
  reviewed_at: string;
  rating: number;
  correct_rate: number;
  detail: string;
};

export function createReviewLog(row: ReviewLogRow): void {
  db.prepare(
    "INSERT INTO review_logs (id, knowledge_point_id, card_id, session_id, reviewed_at, rating, correct_rate, detail) VALUES (@id, @knowledge_point_id, @card_id, @session_id, @reviewed_at, @rating, @correct_rate, @detail)"
  ).run(row);
}

export function getLatestReviewLogForSession(sessionId: string): ReviewLogRow | undefined {
  return db
    .prepare(
      `SELECT *
       FROM review_logs
       WHERE session_id = ?
       ORDER BY reviewed_at DESC, rowid DESC
       LIMIT 1`
    )
    .get(sessionId) as ReviewLogRow | undefined;
}

export function deleteReviewLogById(id: string): number {
  const result = db.prepare("DELETE FROM review_logs WHERE id = ?").run(id);
  return result.changes;
}
