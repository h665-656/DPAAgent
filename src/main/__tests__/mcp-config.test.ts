import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { listMcpServers, saveMcpServer, setMcpServerEnabled } from '../mcp-config'

const workspaces: string[] = []

function createWorkspace(config: Record<string, unknown> = {}): string {
  const workspace = mkdtempSync(join(tmpdir(), 'pi-desktop-mcp-'))
  workspaces.push(workspace)
  writeFileSync(join(workspace, '.mcp.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf-8')
  return workspace
}

function readConfig(workspace: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(workspace, '.mcp.json'), 'utf-8')) as Record<string, unknown>
}

afterEach(() => {
  for (const workspace of workspaces.splice(0)) rmSync(workspace, { recursive: true, force: true })
})

describe('mcp-config', () => {
  it('moves a server between active and disabled maps without losing root settings', () => {
    const workspace = createWorkspace({
      settings: { directTools: true },
      mcpServers: { demo: { command: 'node', args: ['server.js'] } },
    })

    expect(setMcpServerEnabled(workspace, 'demo', false).ok).toBe(true)
    let config = readConfig(workspace)
    expect(config.settings).toEqual({ directTools: true })
    expect(config.mcpServers).toEqual({})
    expect(config.disabledServers).toEqual({ demo: { command: 'node', args: ['server.js'] } })

    expect(setMcpServerEnabled(workspace, 'demo', true).ok).toBe(true)
    config = readConfig(workspace)
    expect(config.mcpServers).toEqual({ demo: { command: 'node', args: ['server.js'] } })
    expect(config.disabledServers).toBeUndefined()
  })

  it('adds validated servers and rejects duplicate names', () => {
    const workspace = createWorkspace()
    const added = saveMcpServer(workspace, 'remote', {
      url: 'https://example.com/mcp',
      headers: { Authorization: '${MCP_TOKEN}' },
      lifecycle: 'lazy',
      directTools: true,
    })

    expect(added.ok).toBe(true)
    expect(saveMcpServer(workspace, 'remote', { command: 'node' }).ok).toBe(false)
    const listed = listMcpServers(workspace)
    expect(listed.ok).toBe(true)
    expect(listed.servers).toEqual([
      expect.objectContaining({ name: 'remote', enabled: true, scope: 'project' }),
    ])
  })

  it('does not overwrite malformed JSON', () => {
    const workspace = createWorkspace()
    writeFileSync(join(workspace, '.mcp.json'), '{ invalid', 'utf-8')
    const result = saveMcpServer(workspace, 'demo', { command: 'node' })
    expect(result.ok).toBe(false)
    expect(readFileSync(join(workspace, '.mcp.json'), 'utf-8')).toBe('{ invalid')
  })
})
