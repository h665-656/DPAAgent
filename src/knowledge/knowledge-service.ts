import { randomUUID } from 'crypto'
import { basename, resolve } from 'path'
import { buildKnowledgeIndex } from './knowledge-indexer.js'
import { getKnowledgeDatabase } from './knowledge-db.js'

export type KnowledgeSource = {
  id: string
  name: string
  path: string
  enabled: boolean
  fileCount: number
  chunkCount: number
  indexedAt: number | null
  error: string | null
}

type SourceRow = {
  id: string
  name: string
  source_path: string
  enabled: number
  file_count: number
  chunk_count: number
  indexed_at: number | null
  error: string | null
}

function mapSource(row: SourceRow): KnowledgeSource {
  return {
    id: row.id,
    name: row.name,
    path: row.source_path,
    enabled: row.enabled === 1,
    fileCount: row.file_count,
    chunkCount: row.chunk_count,
    indexedAt: row.indexed_at,
    error: row.error,
  }
}

function getSource(workspacePath: string, id: string): KnowledgeSource {
  const row = getKnowledgeDatabase(workspacePath)
    .prepare('SELECT * FROM knowledge_sources WHERE id = ?')
    .get(id) as SourceRow | undefined
  if (!row) throw new Error('知识库来源不存在')
  return mapSource(row)
}

export function listKnowledgeSources(workspacePath: string): KnowledgeSource[] {
  const rows = getKnowledgeDatabase(workspacePath)
    .prepare('SELECT * FROM knowledge_sources ORDER BY name COLLATE NOCASE, source_path')
    .all() as SourceRow[]
  return rows.map(mapSource)
}

export async function addKnowledgeSource(
  workspacePath: string,
  sourcePath: string,
): Promise<KnowledgeSource> {
  const db = getKnowledgeDatabase(workspacePath)
  const normalizedPath = resolve(sourcePath)
  const existing = db
    .prepare('SELECT * FROM knowledge_sources WHERE source_path = ?')
    .get(normalizedPath) as SourceRow | undefined
  const id = existing?.id || randomUUID()
  const name = basename(normalizedPath) || normalizedPath
  db.prepare(`INSERT INTO knowledge_sources (id, name, source_path, enabled)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(source_path) DO UPDATE SET name = excluded.name, enabled = 1`)
    .run(id, name, normalizedPath)
  return reindexKnowledgeSource(workspacePath, id)
}

export async function reindexKnowledgeSource(
  workspacePath: string,
  id: string,
): Promise<KnowledgeSource> {
  const db = getKnowledgeDatabase(workspacePath)
  const source = getSource(workspacePath, id)
  try {
    const payload = await buildKnowledgeIndex(source.path)
    const replaceIndex = db.transaction(() => {
      db.prepare('DELETE FROM knowledge_chunks WHERE source_id = ?').run(id)
      const insert = db.prepare(`INSERT INTO knowledge_chunks
        (source_id, file_path, title, content) VALUES (?, ?, ?, ?)`)
      for (const chunk of payload.chunks) {
        insert.run(id, chunk.filePath, chunk.title, chunk.content)
      }
      db.prepare(`UPDATE knowledge_sources SET file_count = ?, chunk_count = ?,
        indexed_at = ?, error = NULL WHERE id = ?`)
        .run(payload.files, payload.chunks.length, Date.now(), id)
    })
    replaceIndex()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    db.prepare('UPDATE knowledge_sources SET error = ? WHERE id = ?').run(message, id)
    throw error
  }
  return getSource(workspacePath, id)
}

export function setKnowledgeSourceEnabled(
  workspacePath: string,
  id: string,
  enabled: boolean,
): KnowledgeSource {
  const result = getKnowledgeDatabase(workspacePath)
    .prepare('UPDATE knowledge_sources SET enabled = ? WHERE id = ?')
    .run(enabled ? 1 : 0, id)
  if (!result.changes) throw new Error('知识库来源不存在')
  return getSource(workspacePath, id)
}

export function removeKnowledgeSource(workspacePath: string, id: string): boolean {
  const db = getKnowledgeDatabase(workspacePath)
  const remove = db.transaction(() => {
    db.prepare('DELETE FROM knowledge_chunks WHERE source_id = ?').run(id)
    return db.prepare('DELETE FROM knowledge_sources WHERE id = ?').run(id)
  })
  return Boolean(remove().changes)
}

export { buildKnowledgeFtsQuery, searchKnowledgeBase } from './knowledge-search.js'
export type { KnowledgeSearchResult } from './knowledge-search.js'
