import { db } from "../db/client.js";

export type NoteRow = {
  id: string;
  deck_id: string;
  knowledge_point_id: string | null;
  front: string;
  back: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

const insertStmt = db.prepare(`
  INSERT INTO notes (
    id, deck_id, knowledge_point_id, front, back, tags, created_at, updated_at
  ) VALUES (
    @id, @deck_id, @knowledge_point_id, @front, @back, @tags, @created_at, @updated_at
  )
`);

export function createNote(row: NoteRow): void {
  insertStmt.run(row);
}

export function listNotes(limit: number, offset: number, deckId?: string): NoteRow[] {
  if (deckId) {
    return db
      .prepare("SELECT * FROM notes WHERE deck_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?")
      .all(deckId, limit, offset) as NoteRow[];
  }

  return db
    .prepare("SELECT * FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as NoteRow[];
}

export function getNoteById(id: string): NoteRow | undefined {
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as NoteRow | undefined;
}

export function getNotesByIds(ids: string[]): NoteRow[] {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(",");
  return db.prepare(`SELECT * FROM notes WHERE id IN (${placeholders})`).all(...ids) as NoteRow[];
}

export function updateNoteTags(id: string, tags: string[], updatedAt: string): number {
  const result = db
    .prepare(`
      UPDATE notes
      SET tags = ?,
          updated_at = ?
      WHERE id = ?
    `)
    .run(JSON.stringify(tags), updatedAt, id);

  return result.changes;
}

export function bulkMoveNotesToDeck(noteIds: string[], deckId: string, updatedAt: string): number {
  if (noteIds.length === 0) {
    return 0;
  }

  const placeholders = noteIds.map(() => "?").join(",");
  const result = db
    .prepare(
      `UPDATE notes
       SET deck_id = ?,
           updated_at = ?
       WHERE id IN (${placeholders})`
    )
    .run(deckId, updatedAt, ...noteIds);

  return result.changes;
}
