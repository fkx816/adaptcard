import { db } from "../db/client.js";

export type SavedCardFilterRow = {
  id: string;
  name: string;
  query_json: string;
  created_at: string;
  updated_at: string;
};

export type SavedCardFilterQuery = {
  search?: string;
  deckId?: string;
  state?: "new" | "learning" | "review" | "relearning" | "suspended";
  sortBy?: "dueAt" | "reps" | "lapses" | "updatedAt";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

const insertStmt = db.prepare(`
  INSERT INTO card_browser_filters (
    id, name, query_json, created_at, updated_at
  ) VALUES (
    @id, @name, @query_json, @created_at, @updated_at
  )
`);

const listStmt = db.prepare(`
  SELECT * FROM card_browser_filters
  ORDER BY updated_at DESC
`);

const getByIdStmt = db.prepare("SELECT * FROM card_browser_filters WHERE id = ?");

export function createSavedCardFilter(row: SavedCardFilterRow): void {
  insertStmt.run(row);
}

export function listSavedCardFilters(): SavedCardFilterRow[] {
  return listStmt.all() as SavedCardFilterRow[];
}

export function getSavedCardFilterById(id: string): SavedCardFilterRow | undefined {
  return getByIdStmt.get(id) as SavedCardFilterRow | undefined;
}
