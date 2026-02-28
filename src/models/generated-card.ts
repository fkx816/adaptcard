import { db } from "../db/client.js";

export type GeneratedCardRow = {
  id: string;
  knowledge_point_id: string;
  generated_at: string;
  expires_at: string;
  is_pinned: number;
  payload: string;
};

export function createGeneratedCard(row: GeneratedCardRow): void {
  db.prepare(
    "INSERT INTO generated_cards (id, knowledge_point_id, generated_at, expires_at, is_pinned, payload) VALUES (@id, @knowledge_point_id, @generated_at, @expires_at, @is_pinned, @payload)"
  ).run(row);
}

export function getGeneratedCard(id: string): GeneratedCardRow | undefined {
  return db.prepare("SELECT * FROM generated_cards WHERE id = ?").get(id) as GeneratedCardRow | undefined;
}

export function cleanupGeneratedCards(nowIso: string): number {
  const result = db.prepare("DELETE FROM generated_cards WHERE is_pinned = 0 AND expires_at < ?").run(nowIso);
  return result.changes;
}
