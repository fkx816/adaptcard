import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

const databaseDir = path.dirname(config.databasePath);
if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

export const db = new Database(config.databasePath);

export function migrate(): void {
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS knowledge_points (
      id TEXT PRIMARY KEY,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      context TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      elapsed_days INTEGER NOT NULL DEFAULT 0,
      scheduled_days INTEGER NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      state INTEGER NOT NULL DEFAULT 0,
      last_review TEXT
    );

    CREATE TABLE IF NOT EXISTS generated_cards (
      id TEXT PRIMARY KEY,
      knowledge_point_id TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      knowledge_point_id TEXT NOT NULL,
      card_id TEXT,
      session_id TEXT,
      reviewed_at TEXT NOT NULL,
      rating INTEGER NOT NULL,
      correct_rate REAL NOT NULL,
      detail TEXT NOT NULL,
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS review_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      reviewed_count INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES decks(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      knowledge_point_id TEXT,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (deck_id) REFERENCES decks(id),
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      deck_id TEXT NOT NULL,
      card_type TEXT NOT NULL DEFAULT 'basic',
      state TEXT NOT NULL DEFAULT 'new',
      due_at TEXT NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (note_id) REFERENCES notes(id),
      FOREIGN KEY (deck_id) REFERENCES decks(id)
    );

    CREATE TABLE IF NOT EXISTS card_browser_filters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      query_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const reviewLogColumns = db
    .prepare("PRAGMA table_info(review_logs)")
    .all() as Array<{ name: string }>;

  if (!reviewLogColumns.some((column) => column.name === "session_id")) {
    db.exec("ALTER TABLE review_logs ADD COLUMN session_id TEXT");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_deck_id ON notes(deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id);
    CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
    CREATE INDEX IF NOT EXISTS idx_cards_due_at ON cards(due_at);
    CREATE INDEX IF NOT EXISTS idx_card_browser_filters_updated_at ON card_browser_filters(updated_at);
  `);
}

migrate();
