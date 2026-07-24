import { getKnowledgeDatabase } from './knowledge-db.js'

export type KnowledgeSearchResult = {
  sourceId: string
  sourceName: string
  filePath: string
  title: string
  excerpt: string
  score: number
}

type SearchRow = {
  source_id: string
  source_name: string
  file_path: string
  title: string
  excerpt: string
  rank: number
}

function addChineseWindows(terms: Set<string>, text: string): void {
  if (text.length <= 4) {
    terms.add(text)
    return
  }
  for (const size of [4, 3]) {
    for (let index = 0; index <= text.length - size && terms.size < 24; index += 1) {
      terms.add(text.slice(index, index + size))
    }
  }
}

export function buildKnowledgeFtsQuery(query: string): string {
  const terms = new Set<string>()
  for (const word of query.match(/[A-Za-z0-9_]{2,}/g) || []) {
    if (terms.size >= 24) break
    terms.add(word.toLowerCase())
  }
  for (const run of query.match(/\p{Script=Han}+/gu) || []) {
    if (terms.size >= 24) break
    addChineseWindows(terms, run)
  }
  return [...terms]
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(' OR ')
}

function cleanExcerpt(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function likeExcerpt(content: string, query: string): string {
  const normalized = cleanExcerpt(content)
  const index = normalized.toLocaleLowerCase().indexOf(query.toLocaleLowerCase())
  if (index < 0) return normalized.slice(0, 320)
  const start = Math.max(0, index - 100)
  const end = Math.min(normalized.length, index + query.length + 200)
  return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${end < normalized.length ? '…' : ''}`
}

function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, '\\$&')
}

function mapRows(rows: SearchRow[]): KnowledgeSearchResult[] {
  return rows.map((row) => ({
    sourceId: row.source_id,
    sourceName: row.source_name,
    filePath: row.file_path,
    title: row.title,
    excerpt: cleanExcerpt(row.excerpt),
    score: Number.isFinite(row.rank) ? -row.rank : 0,
  }))
}

export function searchKnowledgeBase(
  workspacePath: string,
  query: string,
  limit = 6,
): KnowledgeSearchResult[] {
  const normalized = query.trim()
  if (!normalized) return []
  const cappedLimit = Math.min(Math.max(Math.trunc(limit) || 6, 1), 20)
  const db = getKnowledgeDatabase(workspacePath)
  const ftsQuery = buildKnowledgeFtsQuery(normalized)
  if (normalized.length >= 3 && ftsQuery) {
    try {
      const rows = db.prepare(`SELECT chunks.source_id, sources.name AS source_name,
        chunks.file_path, chunks.title,
        snippet(knowledge_chunks, 3, '', '', ' … ', 32) AS excerpt,
        bm25(knowledge_chunks) AS rank
        FROM knowledge_chunks AS chunks
        JOIN knowledge_sources AS sources ON sources.id = chunks.source_id
        WHERE knowledge_chunks MATCH ? AND sources.enabled = 1
        ORDER BY rank LIMIT ?`).all(ftsQuery, cappedLimit) as SearchRow[]
      if (rows.length) return mapRows(rows)
    } catch (error) {
      console.warn('[Knowledge] FTS query failed, using LIKE fallback:', error)
    }
  }
  const pattern = `%${escapeLike(normalized)}%`
  const rows = db.prepare(`SELECT chunks.source_id, sources.name AS source_name,
    chunks.file_path, chunks.title, chunks.content AS excerpt, 0 AS rank
    FROM knowledge_chunks AS chunks
    JOIN knowledge_sources AS sources ON sources.id = chunks.source_id
    WHERE sources.enabled = 1 AND (
      chunks.content LIKE ? ESCAPE '\\' OR chunks.title LIKE ? ESCAPE '\\'
    ) LIMIT ?`).all(pattern, pattern, cappedLimit) as SearchRow[]
  return mapRows(rows).map((row) => ({
    ...row,
    excerpt: likeExcerpt(row.excerpt, normalized),
  }))
}
