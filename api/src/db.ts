// Opens the *existing* SQLite database. This module deliberately does NOT
// call db/migrate.ts's `migrate()` (which also re-runs the seed files with
// `ON CONFLICT ... DO UPDATE`). If we reseeded on every API boot, a restart
// would silently overwrite any node/edge/progress/area edits the user had
// already saved — which would break the "changes survive an API restart"
// requirement. Schema + seed setup is the operator's job via `npm run migrate`
// (run once, before starting the API); the API just opens the resulting file.

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..', '..');
export const DEFAULT_DB_PATH = path.join(ROOT, 'data', 'tree.sqlite');

export function openDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `SQLite DB not found at ${dbPath}. Run \`npm run migrate\` from the repo root first to create it.`,
    );
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const hasNodeTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'node'")
    .get();
  if (!hasNodeTable) {
    db.close();
    throw new Error(
      `SQLite DB at ${dbPath} has no schema applied. Run \`npm run migrate\` from the repo root first.`,
    );
  }

  return db;
}
