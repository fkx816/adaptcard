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
      reviewed_at TEXT NOT NULL,
      rating INTEGER NOT NULL,
      correct_rate REAL NOT NULL,
      detail TEXT NOT NULL,
      FOREIGN KEY (knowledge_point_id) REFERENCES knowledge_points(id)
    );
  `);
}

migrate();
