import { db } from "../db/client.js";

export type ReviewLogRow = {
  id: string;
  knowledge_point_id: string;
  card_id: string | null;
  reviewed_at: string;
  rating: number;
  correct_rate: number;
  detail: string;
};

export function createReviewLog(row: ReviewLogRow): void {
  db.prepare(
    "INSERT INTO review_logs (id, knowledge_point_id, card_id, reviewed_at, rating, correct_rate, detail) VALUES (@id, @knowledge_point_id, @card_id, @reviewed_at, @rating, @correct_rate, @detail)"
  ).run(row);
}
