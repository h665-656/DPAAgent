// IPC Contract - Complete typed method signatures for Renderer/Main/Worker

import type { AppEvent } from './app-events'
import type { DiffResult } from './diff-model'
import type { CompatibilityLevel } from './extension-types'

// ── Workspace ──
export interface WorkspaceOpenRequest { path?: string; awaitWorker?: boolean }
export interface WorkspaceEnsureWorkerRequest { path: string }
export interface WorkspaceEnsureWorkerResponse { ok: boolean; workspaceId: string; sessionId?: string; model?: string; error?: string }
export interface WorkspaceOpenResponse { workspaceId: string; path: string; name: string }
export interface WorkspaceSwitchRequest { workspaceId: string }
export interface WorkspaceSwitchResponse { workspaceId: string; path: string; name: string }

// ── Session ──
export interface SessionInfo {
  sessionId: string
  workspaceId: string
  title: string
  createdAt: number
  updatedAt: number
  modelId: string
  status: 'idle' | 'busy' | 'error'
}
export interface SessionListRequest { workspaceId?: string }
export interface SessionListResponse { sessions: SessionInfo[] }
export interface SessionOpenRequest { sessionId: string; sessionFile?: string }
export interface SessionOpenResponse { session: SessionInfo }
export interface SessionNewRequest { workspaceId: string; title?: string; modelId?: string }
export interface SessionNewResponse { session: SessionInfo }
export interface SessionForkRequest {
  sessionId?: string
  sessionFile: string
  entryId?: string
  /** @deprecated use entryId */
  fromMessageId?: string
  title?: string
  position?: 'before' | 'at'
  workspaceId?: string
}
export interface SessionForkResponse {
  cancelled?: boolean
  error?: string
  editorText?: string
  sessionId?: string
  sessionFile?: string
  workspaceId?: string
  session: SessionInfo & { sessionFile?: string; error?: string }
}
export interface SessionCloneRequest {
  sessionId?: string
  sessionFile: string
  title?: string
  workspaceId?: string
}
export interface SessionCloneResponse {
  cancelled?: boolean
  error?: string
  sessionId?: string
  sessionFile?: string
  workspaceId?: string
  session: SessionInfo & { sessionFile?: string; error?: string }
}
export interface SessionForkCandidatesRequest { sessionFile: string }
export interface SessionForkCandidatesResponse {
  messages: Array<{ entryId: string; text: string }>
  error?: string
}
export interface SessionRenameRequest { sessionId: string; title: string }
export interface SessionRenameResponse { session: SessionInfo }
export interface SessionCompactRequest { sessionId: string }
export interface SessionCompactResponse { sessionId: string; compacted: boolean; tokensSaved: number }
export interface SessionExportRequest { sessionId: string; format: 'json' | 'markdown' | 'html' }
export interface SessionExportResponse { content: string; format: string; filename: string }

// ── Prompt ──
export interface PromptSendRequest { sessionId: string; text: string }
export interface PromptSendResponse { messageId: string }
export interface PromptSteerRequest { sessionId: string; text: string }
export interface PromptSteerResponse { steered: boolean }
export interface PromptFollowUpRequest { sessionId: string; text: string }
export interface PromptFollowUpResponse { messageId: string }
export interface PromptAbortRequest { sessionId: string }
export interface PromptAbortResponse { aborted: boolean }

// ── Model ──
export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextWindow: number
  maxOutput: number
  available: boolean
}
export interface ModelListRequest {
  workspaceId?: string
  /** catalog=~/.pi/agent/models.json 全部条目（设置默认模型）；available=已配置鉴权（Composer） */
  scope?: 'catalog' | 'available'
}
export interface ModelListResponse { models: ModelInfo[] }
export interface ModelSetRequest { sessionId: string; modelId: string }
export interface ModelSetResponse { modelId: string }
export interface ModelCycleRequest { sessionId: string; direction?: 'next' | 'prev' }
export interface ModelCycleResponse { modelId: string; thinkingLevel: string }

export type PiModelsApiType =
  | 'openai-completions'
  | 'openai-responses'
  | 'anthropic-messages'
  | 'google-generative-ai'

export interface PiModelsProviderConfig {
  name?: string
  baseUrl?: string
  api?: PiModelsApiType
  apiKey?: string
  authHeader?: boolean
  headers?: Record<string, string>
  compat?: Record<string, unknown>
  models?: {
    id: string
    name?: string
    api?: string
    reasoning?: boolean
    input?: ('text' | 'image')[]
    contextWindow?: number
    maxTokens?: number
    thinkingLevelMap?: Record<string, string>
  }[]
  modelOverrides?: Record<string, unknown>
}

export interface PiModelsConfigPayload {
  providers: Record<string, PiModelsProviderConfig>
}

export interface PiModelsGetRequest {}
export interface PiModelsGetResponse {
  path: string
  config: PiModelsConfigPayload
  parseError?: string
  schemaError?: string
}

export interface PiModelsSetRequest { config: PiModelsConfigPayload }
export interface PiModelsSetResponse { ok: boolean; path: string; error?: string }

export interface PiModelsFetchRequest {
  baseUrl: string
  apiKey?: string
  authHeader?: boolean
}
export interface PiModelsFetchResponse {
  ok: boolean
  ids?: string[]
  error?: string
}

// ── ThinkingLevel ──
export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'
export interface ThinkingLevelSetRequest { sessionId: string; level: ThinkingLevel }
export interface ThinkingLevelSetResponse { level: string }

// ── Commands ──
export interface CommandInfo {
  id: string
  name: string
  description: string
  category: 'skill' | 'prompt' | 'extension' | 'builtin'
}
export interface CommandsListRequest { sessionId?: string }
export interface CommandsListResponse { commands: CommandInfo[] }

// ── Review ──
export interface ReviewGetDiffRequest {
  sessionId: string
  scope: 'turn' | 'session' | 'git'
  turnId?: string
}
export interface ReviewGetDiffResponse { diff: DiffResult }

export interface ReviewStageHunksRequest {
  cwd: string
  files: { path: string; hunkPatches: string[] }[]
}
export interface ReviewStageHunksResponse { ok: boolean; error?: string }

export interface ReviewCommitRequest {
  cwd: string
  message: string
}
export interface ReviewCommitResponse { ok: boolean; error?: string; commitHash?: string }

// ── Extensions ──
export interface ExtensionInfo {
  id: string
  name: string
  version?: string
  description?: string
  enabled: boolean
  compatibility: CompatibilityLevel
  source: 'global' | 'project' | 'package'
  registeredTools: string[]
  registeredCommands: string[]
  loadError?: string
  piSync?: boolean
  piEnabled?: boolean
  inSettingsPackages?: boolean
  workerLoadHint?: string
}
export interface ExtensionsListRequest {}
export interface ExtensionsListResponse { extensions: ExtensionInfo[] }
export interface ExtensionsSetEnabledRequest { extensionId: string; enabled: boolean }
export interface ExtensionsSetEnabledResponse { ok: boolean; extensionId: string; enabled: boolean; error?: string; needsWorkerReload?: boolean }

// ── MCP servers ──
export type McpServerConfig = Record<string, unknown>
export interface McpServerInfo {
  name: string
  enabled: boolean
  config: McpServerConfig
  toolCount: number
  status: 'ready' | 'loading' | 'disabled'
  scope: 'project'
}
export interface McpListRequest {}
export interface McpListResponse {
  ok: boolean
  configPath: string | null
  servers: McpServerInfo[]
  parseError?: string
}
export interface McpSaveRequest { name: string; config: McpServerConfig; enabled?: boolean }
export interface McpSetEnabledRequest { name: string; enabled: boolean }
export interface McpMutationResponse {
  ok: boolean
  name?: string
  enabled?: boolean
  configPath: string | null
  workerReloaded?: boolean
  reloadError?: string
  error?: string
}

// ── Knowledge base ──
export interface KnowledgeSourceInfo {
  id: string
  name: string
  path: string
  enabled: boolean
  fileCount: number
  chunkCount: number
  indexedAt: number | null
  error: string | null
}
export interface KnowledgeSearchResultInfo {
  sourceId: string
  sourceName: string
  filePath: string
  title: string
  excerpt: string
  score: number
}
export interface KnowledgeListRequest {}
export interface KnowledgeListResponse {
  ok: boolean
  databasePath?: string
  sources: KnowledgeSourceInfo[]
  error?: string
}
export interface KnowledgeAddDirectoryRequest {}
export interface KnowledgeSourceMutationRequest { id: string }
export interface KnowledgeSetEnabledRequest { id: string; enabled: boolean }
export interface KnowledgeMutationResponse {
  ok: boolean
  canceled?: boolean
  source?: KnowledgeSourceInfo
  error?: string
}
export interface KnowledgeSearchRequest { query: string; limit?: number }
export interface KnowledgeSearchResponse {
  ok: boolean
  results: KnowledgeSearchResultInfo[]
  error?: string
}

// ── Registry ──
export interface RegistryRefreshRequest { force?: boolean }
export interface RegistryRefreshResponse { refreshed: boolean; count: number; version?: string }

// ── Settings ──
export interface SettingsGetRequest { key?: string }
export interface SettingsGetResponse { settings: Record<string, unknown> }
export interface SettingsSetRequest { key: string; value: unknown }
export interface SettingsSetResponse { key: string; value: unknown }

// ── App update (GitHub Releases) ──
export interface AppCheckUpdateRequest {}
export interface AppCheckUpdateResponse {
  ok: boolean
  currentVersion: string
  latestVersion: string | null
  hasUpdate: boolean
  releaseUrl: string
  releaseNotes?: string
  downloadUrl?: string | null
  downloadName?: string | null
  assets?: import('./app-update').AppUpdateAsset[]
  error?: string
}
export interface AppOpenReleaseRequest { url?: string }
export interface AppOpenReleaseResponse { ok: boolean }
export interface AppGetPendingUpdateRequest {}
export interface AppGetPendingUpdateResponse {
  update: import('./app-update').AppUpdateAvailableInfo | null
}
export interface AppDismissUpdatePromptRequest {}
export interface AppDismissUpdatePromptResponse { ok: boolean }
export interface AppIgnoreUpdateVersionRequest { version: string }
export interface AppIgnoreUpdateVersionResponse { ok: boolean }
export interface AppDownloadUpdateRequest {
  url: string
  fileName?: string
}
export interface AppDownloadUpdateResponse {
  ok: boolean
  path?: string
  error?: string
}

// ── Events ──
export interface EventsSubscribeRequest { channels?: string[] }
export interface EventsSubscribeResponse { subscriptionId: string }

// ── IPC Method Map ──
export interface IpcMethodMap {
  'workspace.open': { request: WorkspaceOpenRequest; response: WorkspaceOpenResponse }
  'workspace.ensureWorker': { request: WorkspaceEnsureWorkerRequest; response: WorkspaceEnsureWorkerResponse }
  'workspace.switch': { request: WorkspaceSwitchRequest; response: WorkspaceSwitchResponse }
  'session.list': { request: SessionListRequest; response: SessionListResponse }
  'session.open': { request: SessionOpenRequest; response: SessionOpenResponse }
  'session.new': { request: SessionNewRequest; response: SessionNewResponse }
  'session.fork': { request: SessionForkRequest; response: SessionForkResponse }
  'session.forkCandidates': { request: SessionForkCandidatesRequest; response: SessionForkCandidatesResponse }
  'session.clone': { request: SessionCloneRequest; response: SessionCloneResponse }
  'session.rename': { request: SessionRenameRequest; response: SessionRenameResponse }
  'session.compact': { request: SessionCompactRequest; response: SessionCompactResponse }
  'session.export': { request: SessionExportRequest; response: SessionExportResponse }
  'prompt.send': { request: PromptSendRequest; response: PromptSendResponse }
  'prompt.steer': { request: PromptSteerRequest; response: PromptSteerResponse }
  'prompt.followUp': { request: PromptFollowUpRequest; response: PromptFollowUpResponse }
  'prompt.abort': { request: PromptAbortRequest; response: PromptAbortResponse }
  'model.list': { request: ModelListRequest; response: ModelListResponse }
  'model.set': { request: ModelSetRequest; response: ModelSetResponse }
  'model.cycle': { request: ModelCycleRequest; response: ModelCycleResponse }
  'pi.models.get': { request: PiModelsGetRequest; response: PiModelsGetResponse }
  'pi.models.set': { request: PiModelsSetRequest; response: PiModelsSetResponse }
  'pi.models.fetch': { request: PiModelsFetchRequest; response: PiModelsFetchResponse }
  'thinkingLevel.set': { request: ThinkingLevelSetRequest; response: ThinkingLevelSetResponse }
  'commands.list': { request: CommandsListRequest; response: CommandsListResponse }
  'review.getDiff': { request: ReviewGetDiffRequest; response: ReviewGetDiffResponse }
  'review.stageHunks': { request: ReviewStageHunksRequest; response: ReviewStageHunksResponse }
  'review.unstageHunks': { request: ReviewStageHunksRequest; response: ReviewStageHunksResponse }
  'review.commit': { request: ReviewCommitRequest; response: ReviewCommitResponse }
  'extensions.list': { request: ExtensionsListRequest; response: ExtensionsListResponse }
  'extensions.setEnabled': { request: ExtensionsSetEnabledRequest; response: ExtensionsSetEnabledResponse }
  'mcp.list': { request: McpListRequest; response: McpListResponse }
  'mcp.save': { request: McpSaveRequest; response: McpMutationResponse }
  'mcp.setEnabled': { request: McpSetEnabledRequest; response: McpMutationResponse }
  'knowledge.list': { request: KnowledgeListRequest; response: KnowledgeListResponse }
  'knowledge.addDirectory': { request: KnowledgeAddDirectoryRequest; response: KnowledgeMutationResponse }
  'knowledge.setEnabled': { request: KnowledgeSetEnabledRequest; response: KnowledgeMutationResponse }
  'knowledge.remove': { request: KnowledgeSourceMutationRequest; response: KnowledgeMutationResponse }
  'knowledge.reindex': { request: KnowledgeSourceMutationRequest; response: KnowledgeMutationResponse }
  'knowledge.search': { request: KnowledgeSearchRequest; response: KnowledgeSearchResponse }
  'registry.refresh': { request: RegistryRefreshRequest; response: RegistryRefreshResponse }
  'settings.get': { request: SettingsGetRequest; response: SettingsGetResponse }
  'settings.set': { request: SettingsSetRequest; response: SettingsSetResponse }
  'app.checkUpdate': { request: AppCheckUpdateRequest; response: AppCheckUpdateResponse }
  'app.getPendingUpdate': {
    request: AppGetPendingUpdateRequest
    response: AppGetPendingUpdateResponse
  }
  'app.dismissUpdatePrompt': {
    request: AppDismissUpdatePromptRequest
    response: AppDismissUpdatePromptResponse
  }
  'app.openRelease': { request: AppOpenReleaseRequest; response: AppOpenReleaseResponse }
  'app.ignoreUpdateVersion': {
    request: AppIgnoreUpdateVersionRequest
    response: AppIgnoreUpdateVersionResponse
  }
  'app.downloadUpdate': {
    request: AppDownloadUpdateRequest
    response: AppDownloadUpdateResponse
  }
  'events.subscribe': { request: EventsSubscribeRequest; response: EventsSubscribeResponse; stream: AppEvent }
}

// ── Type helpers ──
export type IpcMethodName = keyof IpcMethodMap
export type IpcRequest<M extends IpcMethodName> = IpcMethodMap[M]['request']
export type IpcResponse<M extends IpcMethodName> = IpcMethodMap[M]['response']

export function ipcChannel<M extends IpcMethodName>(method: M): string {
  return `ipc:${method}`
}

export interface IpcInvoker {
  invoke<M extends IpcMethodName>(method: M, request: IpcRequest<M>): Promise<IpcResponse<M>>
}

export interface IpcHandler<M extends IpcMethodName> {
  (request: IpcRequest<M>): Promise<IpcResponse<M>>
}

export const EVENTS_CHANNEL = 'ipc:events'
