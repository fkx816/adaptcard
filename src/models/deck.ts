import { db } from "../db/client.js";

export type DeckRow = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

const insertStmt = db.prepare(`
  INSERT INTO decks (id, name, parent_id, created_at, updated_at)
  VALUES (@id, @name, @parent_id, @created_at, @updated_at)
`);

const updateStmt = db.prepare(`
  UPDATE decks
  SET name = @name,
      parent_id = @parent_id,
      updated_at = @updated_at
  WHERE id = @id
`);

const deleteStmt = db.prepare("DELETE FROM decks WHERE id = ?");

export function createDeck(row: DeckRow): void {
  insertStmt.run(row);
}

export function getDeckById(id: string): DeckRow | undefined {
  return db.prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
}

export function listDecks(): DeckRow[] {
  return db.prepare("SELECT * FROM decks ORDER BY created_at ASC").all() as DeckRow[];
}

export function updateDeck(input: { id: string; name: string; parent_id: string | null; updated_at: string }): number {
  const result = updateStmt.run(input);
  return result.changes;
}

export function deleteDeck(id: string): number {
  const result = deleteStmt.run(id);
  return result.changes;
}

export function countDeckChildren(parentId: string): number {
  const row = db.prepare("SELECT COUNT(1) as count FROM decks WHERE parent_id = ?").get(parentId) as { count: number };
  return row.count;
}

export function getDeckWorkload(deckId: string, asOfIso: string): {
  totalCount: number;
  dueCount: number;
  overdueCount: number;
  stateBreakdown: Record<string, number>;
} {
  const summary = db
    .prepare(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM decks WHERE id = ?
         UNION ALL
         SELECT d.id
         FROM decks d
         INNER JOIN subtree s ON d.parent_id = s.id
       )
       SELECT
         COUNT(*) as totalCount,
         SUM(CASE WHEN c.due_at <= ? THEN 1 ELSE 0 END) as dueCount,
         SUM(CASE WHEN c.due_at < ? THEN 1 ELSE 0 END) as overdueCount
       FROM cards c
       INNER JOIN subtree s ON c.deck_id = s.id`
    )
    .get(deckId, asOfIso, asOfIso) as {
    totalCount: number;
    dueCount: number | null;
    overdueCount: number | null;
  };

  const stateRows = db
    .prepare(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM decks WHERE id = ?
         UNION ALL
         SELECT d.id
         FROM decks d
         INNER JOIN subtree s ON d.parent_id = s.id
       )
       SELECT c.state as state, COUNT(*) as count
       FROM cards c
       INNER JOIN subtree s ON c.deck_id = s.id
       GROUP BY c.state`
    )
    .all(deckId) as Array<{ state: string; count: number }>;

  const stateBreakdown = stateRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.state] = row.count;
    return acc;
  }, {});

  return {
    totalCount: summary.totalCount,
    dueCount: summary.dueCount ?? 0,
    overdueCount: summary.overdueCount ?? 0,
    stateBreakdown
  };
}
