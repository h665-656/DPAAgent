import { createRequire } from 'module'
import { mkdirSync } from 'fs'
import { dirname, join, resolve } from 'path'

export type KnowledgeStatement = {
  run: (...args: unknown[]) => { changes?: number }
  all: (...args: unknown[]) => unknown[]
  get: (...args: unknown[]) => unknown
}

export type KnowledgeDatabase = {
  pragma: (value: string) => unknown
  exec: (sql: string) => void
  prepare: (sql: string) => KnowledgeStatement
  close: () => void
  transaction: <TArgs extends unknown[], TResult>(
    fn: (...args: TArgs) => TResult,
  ) => (...args: TArgs) => TResult
}

const nativeRequire = createRequire(import.meta.url)
const databases = new Map<string, KnowledgeDatabase>()
let DatabaseCtor: (new (path: string) => KnowledgeDatabase) | null = null

function loadDatabase(): new (path: string) => KnowledgeDatabase {
  if (DatabaseCtor) return DatabaseCtor
  const module = nativeRequire('better-sqlite3') as {
    default?: new (path: string) => KnowledgeDatabase
  } & (new (path: string) => KnowledgeDatabase)
  DatabaseCtor = module.default || module
  return DatabaseCtor
}

function initialize(db: KnowledgeDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source_path TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      file_count INTEGER NOT NULL DEFAULT 0,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      indexed_at INTEGER,
      error TEXT
    );
  `)
  try {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks USING fts5(
      source_id UNINDEXED, file_path UNINDEXED, title, content, tokenize='trigram'
    );`)
  } catch {
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks USING fts5(
      source_id UNINDEXED, file_path UNINDEXED, title, content, tokenize='unicode61'
    );`)
  }
}

export function knowledgeDatabasePath(workspacePath: string): string {
  return join(resolve(workspacePath), '.pi', 'knowledge-base.db')
}

export function getKnowledgeDatabase(workspacePath: string): KnowledgeDatabase {
  const dbPath = knowledgeDatabasePath(workspacePath)
  const existing = databases.get(dbPath)
  if (existing) return existing
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new (loadDatabase())(dbPath)
  db.pragma('journal_mode = WAL')
  initialize(db)
  databases.set(dbPath, db)
  return db
}

export function closeKnowledgeDatabase(workspacePath: string): void {
  const dbPath = knowledgeDatabasePath(workspacePath)
  const db = databases.get(dbPath)
  if (!db) return
  db.close()
  databases.delete(dbPath)
}
