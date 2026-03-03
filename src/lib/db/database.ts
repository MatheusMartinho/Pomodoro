'use client';

import initSqlJs, { Database } from 'sql.js';

const DB_NAME = 'agentic_tracker_db';

let db: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tech',
    unit TEXT NOT NULL DEFAULT 'minutos',
    minimum INTEGER NOT NULL DEFAULT 5,
    target INTEGER NOT NULL DEFAULT 30,
    maximum INTEGER NOT NULL DEFAULT 60,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    date TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    pomodoros INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(habit_id, date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    completed INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    focus_habit_id TEXT,
    started_at TEXT NOT NULL DEFAULT (date('now')),
    target_end TEXT NOT NULL,
    ended_at TEXT,
    reflection TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (focus_habit_id) REFERENCES habits(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_entries_habit_date ON entries(habit_id, date);
  CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
  CREATE INDEX IF NOT EXISTS idx_pomodoro_habit ON pomodoro_sessions(habit_id);
`;

function generateId(): string {
  return crypto.randomUUID();
}

function saveToStorage(database: Database): void {
  try {
    const data = database.export();
    const buffer = new Uint8Array(data);
    const base64 = btoa(String.fromCharCode(...buffer));
    localStorage.setItem(DB_NAME, base64);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

function loadFromStorage(): Uint8Array | null {
  try {
    const base64 = localStorage.getItem(DB_NAME);
    if (!base64) return null;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error('Error loading database:', e);
    return null;
  }
}

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    const savedData = loadFromStorage();
    if (savedData) {
      db = new SQL.Database(savedData);
    } else {
      db = new SQL.Database();
      db.run(SCHEMA);
      saveToStorage(db);
    }

    return db;
  })();

  return dbInitPromise;
}

export function save(): void {
  if (db) {
    saveToStorage(db);
  }
}

export function resetDatabase(): void {
  localStorage.removeItem(DB_NAME);
  db = null;
  dbInitPromise = null;
  console.log('Database reset. Refresh the page.');
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as unknown as { resetDB: () => void }).resetDB = resetDatabase;
}

export { generateId };
