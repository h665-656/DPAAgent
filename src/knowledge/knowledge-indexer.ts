import { readFile, readdir, stat } from 'fs/promises'
import { basename, extname, join, resolve } from 'path'

export type KnowledgeChunkInput = {
  filePath: string
  title: string
  content: string
}

export type KnowledgeIndexPayload = {
  files: number
  chunks: KnowledgeChunkInput[]
}

const SUPPORTED_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.text', '.json', '.jsonl', '.csv', '.tsv',
  '.yaml', '.yml', '.html', '.htm', '.log', '.ini', '.cfg', '.conf',
])
const SKIPPED_DIRECTORIES = new Set([
  '.git', '.pi', 'node_modules', 'dist', 'out', 'build', 'coverage', 'tmp', 'temp',
])
const MAX_FILES = 2_000
const MAX_FILE_BYTES = 2 * 1024 * 1024
const CHUNK_SIZE = 1_600
const CHUNK_OVERLAP = 200

export function chunkKnowledgeText(input: string): string[] {
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim()
  if (!text) return []
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)
    if (end < text.length) {
      const boundary = text.lastIndexOf('\n', end)
      if (boundary > start + Math.floor(CHUNK_SIZE / 2)) end = boundary
    }
    const chunk = text.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= text.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP)
  }
  return chunks
}

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const visit = async (directory: string): Promise<void> => {
    if (files.length >= MAX_FILES) return
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (files.length >= MAX_FILES) break
      const fullPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')) {
          await visit(fullPath)
        }
      } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath)
      }
    }
  }
  await visit(root)
  return files
}

export async function buildKnowledgeIndex(sourcePath: string): Promise<KnowledgeIndexPayload> {
  const root = resolve(sourcePath)
  const info = await stat(root)
  if (!info.isDirectory()) throw new Error('知识库来源必须是目录')
  const files = await collectFiles(root)
  const chunks: KnowledgeChunkInput[] = []
  let indexedFiles = 0
  for (const filePath of files) {
    const fileInfo = await stat(filePath).catch(() => null)
    if (!fileInfo || fileInfo.size > MAX_FILE_BYTES) continue
    const content = await readFile(filePath, 'utf-8').catch(() => '')
    if (!content || content.includes('\0')) continue
    const fileChunks = chunkKnowledgeText(content)
    if (!fileChunks.length) continue
    indexedFiles += 1
    for (const chunk of fileChunks) {
      chunks.push({ filePath, title: basename(filePath), content: chunk })
    }
  }
  return { files: indexedFiles, chunks }
}
