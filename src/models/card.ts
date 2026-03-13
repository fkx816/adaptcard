import { db } from "../db/client.js";

export type CardRow = {
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
};

export type CardQuery = {
  search?: string;
  deckId?: string;
  state?: string;
  sortBy: "dueAt" | "reps" | "lapses" | "updatedAt";
  sortOrder: "asc" | "desc";
  limit: number;
  offset: number;
};

const insertStmt = db.prepare(`
  INSERT INTO cards (
    id, note_id, deck_id, card_type, state, due_at, reps, lapses, created_at, updated_at
  ) VALUES (
    @id, @note_id, @deck_id, @card_type, @state, @due_at, @reps, @lapses, @created_at, @updated_at
  )
`);

const SORT_COLUMN_MAP: Record<CardQuery["sortBy"], string> = {
  dueAt: "c.due_at",
  reps: "c.reps",
  lapses: "c.lapses",
  updatedAt: "c.updated_at"
};

export function createCard(row: CardRow): void {
  insertStmt.run(row);
}

const getByIdStmt = db.prepare("SELECT * FROM cards WHERE id = ?");

const updateStateStmt = db.prepare(`
  UPDATE cards
  SET state = @state,
      updated_at = @updated_at
  WHERE id = @id
`);

export function getCardById(id: string): CardRow | undefined {
  return getByIdStmt.get(id) as CardRow | undefined;
}

export function getCardsByIds(ids: string[]): CardRow[] {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`SELECT * FROM cards WHERE id IN (${placeholders})`).all(...ids) as CardRow[];
}

export function updateCardState(id: string, state: CardRow["state"], updatedAt: string): void {
  updateStateStmt.run({ id, state, updated_at: updatedAt });
}

export function bulkMoveCardsToDeck(cardIds: string[], deckId: string, updatedAt: string): number {
  if (cardIds.length === 0) {
    return 0;
  }

  const placeholders = cardIds.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE cards
       SET deck_id = ?,
           updated_at = ?
       WHERE id IN (${placeholders})`
    )
    .run(deckId, updatedAt, ...cardIds);

  return result.changes;
}

export function listCards(query: CardQuery): { items: Array<CardRow & { front: string; back: string; tags: string }>; total: number } {
  const whereParts: string[] = [];
  const params: Array<string | number> = [];

  if (query.deckId) {
    whereParts.push("c.deck_id = ?");
    params.push(query.deckId);
  }

  if (query.state) {
    whereParts.push("c.state = ?");
    params.push(query.state);
  }

  if (query.search) {
    whereParts.push("(n.front LIKE ? OR n.back LIKE ? OR n.tags LIKE ?)");
    const searchLike = `%${query.search}%`;
    params.push(searchLike, searchLike, searchLike);
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const sortColumn = SORT_COLUMN_MAP[query.sortBy];
  const sortOrder = query.sortOrder.toUpperCase();

  const items = db
    .prepare(
      `SELECT c.*, n.front, n.back, n.tags
       FROM cards c
       INNER JOIN notes n ON n.id = c.note_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`
    )
    .all(...params, query.limit, query.offset) as Array<CardRow & { front: string; back: string; tags: string }>;

  const total = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM cards c
       INNER JOIN notes n ON n.id = c.note_id
       ${whereClause}`
    )
    .get(...params) as { count: number };

  return { items, total: total.count };
}
