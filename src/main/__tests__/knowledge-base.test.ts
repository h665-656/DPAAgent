import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildKnowledgeFtsQuery } from '../../knowledge/knowledge-search'
import { buildKnowledgeIndex, chunkKnowledgeText } from '../../knowledge/knowledge-indexer'

const workspaces: string[] = []

function createWorkspace(): { workspace: string; source: string } {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-desktop-knowledge-'))
  const source = join(workspace, 'docs')
  mkdirSync(source)
  workspaces.push(workspace)
  return { workspace, source }
}

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true })
  }
})

describe('knowledge base', () => {
  it('normalizes BOM and CRLF before chunking', () => {
    expect(chunkKnowledgeText('\uFEFFfirst\r\nsecond\rthird')).toEqual([
      'first\nsecond\nthird',
    ])
  })

  it('builds bounded Chinese and English FTS terms', () => {
    const query = buildKnowledgeFtsQuery('设备标定 calibration')
    expect(query).toContain('"calibration"')
    expect(query).toContain('"设备标定"')
    expect(query.split(' OR ').length).toBeLessThanOrEqual(24)
  })

  it('indexes supported files and skips hidden or unsupported files', async () => {
    const { source } = createWorkspace()
    writeFileSync(join(source, 'guide.md'), '# 设备标定\n先关闭采集，再执行调零。', 'utf-8')
    writeFileSync(join(source, 'notes.txt'), '\uFEFFCalibration baseline\r\nKeep the sensor stable.', 'utf-8')
    writeFileSync(join(source, 'manual.pdf'), 'not indexed', 'utf-8')
    mkdirSync(join(source, '.hidden'))
    writeFileSync(join(source, '.hidden', 'secret.md'), '不应建立索引', 'utf-8')

    const indexed = await buildKnowledgeIndex(source)
    expect(indexed.files).toBe(2)
    expect(indexed.chunks).toHaveLength(2)
    expect(indexed.chunks.map((chunk) => chunk.title).sort()).toEqual([
      'guide.md',
      'notes.txt',
    ])
    expect(indexed.chunks.every((chunk) => !chunk.content.includes('\r'))).toBe(true)
  })
})
