import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join, resolve } from 'path'

export type McpServerConfig = Record<string, unknown>

export type McpServerStatus = 'ready' | 'loading' | 'disabled'

export interface McpServerRow {
  name: string
  enabled: boolean
  config: McpServerConfig
  toolCount: number
  status: McpServerStatus
  scope: 'project'
}

export interface McpListResult {
  ok: boolean
  configPath: string | null
  servers: McpServerRow[]
  parseError?: string
}

export interface McpMutationResult {
  ok: boolean
  name?: string
  enabled?: boolean
  configPath: string | null
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'string')
}

function projectConfigPath(cwd: string): string {
  return join(resolve(cwd), '.mcp.json')
}

function readObject(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  const text = readFileSync(path, 'utf-8').replace(/^\uFEFF/, '')
  const value: unknown = JSON.parse(text)
  if (!isRecord(value)) throw new Error('MCP 配置根节点必须是 JSON 对象')
  return value
}

function readProjectConfig(cwd: string): { path: string; raw: Record<string, unknown>; parseError?: string } {
  const path = projectConfigPath(cwd)
  if (!existsSync(path)) return { path, raw: {} }
  try {
    return { path, raw: readObject(path) }
  } catch (error) {
    return { path, raw: {}, parseError: error instanceof Error ? error.message : String(error) }
  }
}

function serverMap(raw: Record<string, unknown>, key: string): Record<string, McpServerConfig> {
  const value = raw[key]
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, definition]) => isRecord(definition)),
  ) as Record<string, McpServerConfig>
}

function readToolCounts(): Record<string, number> {
  const cachePath = join(homedir(), '.pi', 'agent', 'mcp-cache.json')
  try {
    const raw = readObject(cachePath)
    const servers = isRecord(raw.servers) ? raw.servers : {}
    return Object.fromEntries(
      Object.entries(servers).map(([name, value]) => {
        const tools = isRecord(value) && Array.isArray(value.tools) ? value.tools : []
        return [name, tools.length]
      }),
    )
  } catch {
    return {}
  }
}

function writeProjectConfig(path: string, raw: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.${process.pid}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(raw, null, 2)}\n`, 'utf-8')
  renameSync(tempPath, path)
}

function getConfigMaps(raw: Record<string, unknown>): {
  active: Record<string, McpServerConfig>
  disabled: Record<string, McpServerConfig>
} {
  return {
    active: { ...serverMap(raw, 'mcp-servers'), ...serverMap(raw, 'mcpServers') },
    disabled: serverMap(raw, 'disabledServers'),
  }
}

function persistConfigMaps(
  path: string,
  raw: Record<string, unknown>,
  active: Record<string, McpServerConfig>,
  disabled: Record<string, McpServerConfig>,
): void {
  delete raw['mcp-servers']
  raw.mcpServers = active
  if (Object.keys(disabled).length > 0) raw.disabledServers = disabled
  else delete raw.disabledServers
  writeProjectConfig(path, raw)
}

export function listMcpServers(cwd: string | null | undefined): McpListResult {
  if (!cwd?.trim()) return { ok: false, configPath: null, servers: [], parseError: 'no_workspace' }
  const loaded = readProjectConfig(cwd)
  if (loaded.parseError) return { ok: false, configPath: loaded.path, servers: [], parseError: loaded.parseError }
  const { active, disabled } = getConfigMaps(loaded.raw)
  const counts = readToolCounts()
  const servers: McpServerRow[] = [
    ...Object.entries(active).map(([name, config]) => ({
      name,
      enabled: true,
      config,
      toolCount: counts[name] ?? 0,
      status: (counts[name] ? 'ready' : 'loading') as McpServerStatus,
      scope: 'project' as const,
    })),
    ...Object.entries(disabled).filter(([name]) => !Object.hasOwn(active, name)).map(([name, config]) => ({
      name,
      enabled: false,
      config,
      toolCount: counts[name] ?? 0,
      status: 'disabled' as const,
      scope: 'project' as const,
    })),
  ]
  servers.sort((left, right) => left.name.localeCompare(right.name))
  return { ok: true, configPath: loaded.path, servers }
}

export function validateMcpServerConfig(value: unknown): { ok: true; config: McpServerConfig } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: '服务器配置必须是 JSON 对象' }
  const config = { ...value }
  const command = config.command
  const url = config.url
  const hasCommand = typeof command === 'string' && command.trim().length > 0
  const hasUrl = typeof url === 'string' && url.trim().length > 0
  if (hasCommand === hasUrl) {
    return { ok: false, error: 'command 和 url 必须且只能填写一个' }
  }
  if (command !== undefined && (typeof command !== 'string' || !command.trim())) {
    return { ok: false, error: 'command 不能为空' }
  }
  if (url !== undefined && (typeof url !== 'string' || !url.trim())) {
    return { ok: false, error: 'url 不能为空' }
  }
  if (hasUrl) {
    try {
      const parsed = new URL(url.trim())
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol')
    } catch {
      return { ok: false, error: 'url 必须是有效的 HTTP/HTTPS 地址' }
    }
  }
  if (config.args !== undefined && (!Array.isArray(config.args) || config.args.some((item) => typeof item !== 'string'))) {
    return { ok: false, error: 'args 必须是字符串数组' }
  }
  if (config.env !== undefined && !isStringRecord(config.env)) {
    return { ok: false, error: 'env 必须是字符串键值对象' }
  }
  if (config.headers !== undefined && !isStringRecord(config.headers)) {
    return { ok: false, error: 'headers 必须是字符串键值对象' }
  }
  if (config.lifecycle !== undefined && !['lazy', 'eager', 'keep-alive'].includes(String(config.lifecycle))) {
    return { ok: false, error: 'lifecycle 必须是 lazy、eager 或 keep-alive' }
  }
  if (config.directTools !== undefined && typeof config.directTools !== 'boolean'
    && (!Array.isArray(config.directTools) || config.directTools.some((item) => typeof item !== 'string'))) {
    return { ok: false, error: 'directTools 必须是布尔值或字符串数组' }
  }
  if (hasCommand) config.command = command.trim()
  if (hasUrl) config.url = url.trim()
  return { ok: true, config }
}

function validateServerName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || !value.trim()) return { ok: false, error: '服务器名称不能为空' }
  const name = value.trim()
  if (name.length > 80) return { ok: false, error: '服务器名称不能超过 80 个字符' }
  if (['.', '..', '__proto__', 'prototype', 'constructor'].includes(name) || /[\\/]/.test(name)) {
    return { ok: false, error: '服务器名称包含非法字符' }
  }
  return { ok: true, name }
}

export function saveMcpServer(
  cwd: string | null | undefined,
  nameValue: unknown,
  configValue: unknown,
  enabled = true,
): McpMutationResult {
  if (!cwd?.trim()) return { ok: false, configPath: null, error: '未打开工作区' }
  const loaded = readProjectConfig(cwd)
  if (loaded.parseError) return { ok: false, configPath: loaded.path, error: loaded.parseError }
  const nameResult = validateServerName(nameValue)
  if (!nameResult.ok) return { ok: false, configPath: loaded.path, error: nameResult.error }
  const configResult = validateMcpServerConfig(configValue)
  if (!configResult.ok) return { ok: false, configPath: loaded.path, error: configResult.error }
  const { active, disabled } = getConfigMaps(loaded.raw)
  const { name } = nameResult
  if (Object.hasOwn(active, name) || Object.hasOwn(disabled, name)) {
    return { ok: false, name, configPath: loaded.path, error: '同名 MCP Server 已存在' }
  }
  if (enabled) active[name] = configResult.config
  else disabled[name] = configResult.config
  try {
    persistConfigMaps(loaded.path, loaded.raw, active, disabled)
    return { ok: true, name, enabled, configPath: loaded.path }
  } catch (error) {
    return { ok: false, name, configPath: loaded.path, error: error instanceof Error ? error.message : String(error) }
  }
}

export function setMcpServerEnabled(
  cwd: string | null | undefined,
  nameValue: unknown,
  enabled: boolean,
): McpMutationResult {
  if (!cwd?.trim()) return { ok: false, configPath: null, error: '未打开工作区' }
  const loaded = readProjectConfig(cwd)
  if (loaded.parseError) return { ok: false, configPath: loaded.path, error: loaded.parseError }
  const nameResult = validateServerName(nameValue)
  if (!nameResult.ok) return { ok: false, configPath: loaded.path, error: nameResult.error }
  const { active, disabled } = getConfigMaps(loaded.raw)
  const { name } = nameResult
  const source = enabled ? disabled : active
  const target = enabled ? active : disabled
  const config = source[name]
  if (!config) {
    if (target[name]) return { ok: true, name, enabled, configPath: loaded.path }
    return { ok: false, name, configPath: loaded.path, error: '未找到 MCP Server' }
  }
  delete source[name]
  target[name] = config
  try {
    persistConfigMaps(loaded.path, loaded.raw, active, disabled)
    return { ok: true, name, enabled, configPath: loaded.path }
  } catch (error) {
    return { ok: false, name, configPath: loaded.path, error: error instanceof Error ? error.message : String(error) }
  }
}
