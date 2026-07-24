import type { TimelineItem } from '@renderer/stores/ui-store-types'

export type ExperimentStepStatus = 'pending' | 'running' | 'waiting' | 'done' | 'failed'

export type ExperimentOperation = {
  id: string
  toolName: string
  title: string
  callId?: string
  phase?: string
  args?: string
  result?: string
  details?: string
  status: ExperimentStepStatus
  timestamp: number
}

export type ExperimentStage = {
  id: string
  title: string
  description: string
  status: ExperimentStepStatus
  operations: ExperimentOperation[]
}

export type ExperimentProgress = {
  stages: ExperimentStage[]
  stage: string
  percent: number
  doneCount: number
  failedCount: number
  waitingCount: number
}

export function isExperimentSessionOpen(input: {
  currentSessionId: string | null
  historySessionFile: string | null
  ephemeralSandboxDraft: boolean
  pendingNewSessionPlaceholder: boolean
}): boolean {
  return Boolean(
    input.currentSessionId &&
    input.historySessionFile &&
    !input.ephemeralSandboxDraft &&
    !input.pendingNewSessionPlaceholder
  )
}

const TOOL_LABELS: Record<string, string> = {
  dpa_ensure_running: '启动并连接 DPA',
  dpa_get_app_context: '读取 DPA 当前状态',
  dpa_get_project_info: '读取试验项目信息',
  dpa_find_devices: '搜索采集设备',
  dpa_list_found_devices: '检查已发现设备',
  dpa_add_found_device: '添加采集设备',
  dpa_list_devices: '检查设备连接状态',
  dpa_connect_device: '连接采集设备',
  dpa_connect_all_devices: '连接全部设备',
  dpa_get_daq_status: '检查采集与存储状态',
  dpa_list_daq_channels: '读取采集通道',
  dpa_get_daq_channel_param: '读取通道参数',
  dpa_set_daq_channel_param: '设置通道参数',
  dpa_batch_apply_channel_param: '批量应用通道参数',
  dpa_list_channels: '读取数据通道',
  dpa_create_analysis: '创建数据分析',
  dpa_get_current_analysis: '检查当前分析',
  dpa_set_process_param: '配置分析参数',
  dpa_execute_current_process: '执行当前分析',
  dpa_export_data: '导出实验数据',
  dpa_export_channel_data: '导出通道数据',
  dpa_export_record: '导出分析记录',
}

const STAGES = [
  { id: 'device', title: '设备连接', description: '发现、添加并连接采集设备' },
  { id: 'config', title: '参数配置', description: '配置采样率、量程、灵敏度与存储通道' },
  { id: 'acquisition', title: '试验采集与存储', description: '启动采集、记录数据并安全停止' },
  { id: 'analysis', title: '数据分析', description: '检查数据、执行分析并查看结果' },
  { id: 'export', title: '结果与报告导出', description: '导出数据、分析记录与实验报告' },
] as const

function stageIdFor(item: TimelineItem): string | undefined {
  const name = item.toolName || ''
  const args = JSON.stringify(item.toolArgs || {})
  if (/export_(data|channel_data|record)/.test(name)) return 'export'
  if (name === 'dpa_get_daq_status') return 'acquisition'
  if (/daq_channel|list_daq_channels/.test(name)) return 'config'
  if (/device|ensure_running|get_app_context|get_project_info/.test(name)) return 'device'
  if (name === 'dpa_switch_page') {
    if (/存储配置/.test(args)) return 'acquisition'
    if (/通道设置/.test(args)) return 'config'
    return 'device'
  }
  if (name === 'dpa_switch_test_tab') return /采集试验/.test(args) ? 'acquisition' : 'analysis'
  if (/analysis|process|channel|statistics|data|waveform|plot|layout|display|axis/.test(name)) {
    return 'analysis'
  }
  return undefined
}

function labelForTool(toolName: string): string {
  if (TOOL_LABELS[toolName]) return TOOL_LABELS[toolName]
  return toolName.replace(/^dpa_/, '').split('_').filter(Boolean).join(' · ')
}

function formatPayload(value: unknown): string | undefined {
  if (value == null || value === '') return undefined
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function statusForItem(item: TimelineItem): ExperimentStepStatus {
  if (item.isError) return 'failed'
  const output = `${item.toolStatusLine || ''} ${item.toolOutput || ''}`
  if (/confirmation_required|等待.*确认|待确认|\bpending\b/i.test(output)) return 'waiting'
  if (item.toolPhase === 'end') return 'done'
  return 'running'
}

const COMPLETION_TOOLS: Record<string, RegExp> = {
  device: /^dpa_connect_(device|all_devices)$/,
  config: /^dpa_(set_daq_channel_param|batch_apply_channel_param)$/,
  analysis: /^dpa_(create_analysis|execute_current_process)$/,
  export: /^dpa_export_(data|channel_data|record)$/,
}

function acquisitionStatus(items: TimelineItem[]): ExperimentStepStatus {
  const checks = items.filter((item) => item.toolName === 'dpa_get_daq_status')
  const live = checks.find((item) => item.toolPhase !== 'end')
  if (live) return 'running'
  const successful = checks.filter((item) => !item.isError && item.toolPhase === 'end')
  const states = successful.map((item) => {
    const output = item.toolOutput || ''
    return /\b(?:running|saving)\b(?:\u0022|')?\s*:\s*true/i.test(output)
  })
  if (states.at(-1)) return 'running'
  if (states.slice(0, -1).some(Boolean) && states.at(-1) === false) return 'done'
  if (checks.at(-1)?.isError) return 'failed'
  return checks.length ? 'running' : 'pending'
}

function stageStatus(stageId: string, items: TimelineItem[]): ExperimentStepStatus {
  if (stageId === 'acquisition') return acquisitionStatus(items)
  if (items.some((item) => statusForItem(item) === 'running')) return 'running'
  if (items.some((item) => statusForItem(item) === 'waiting')) return 'waiting'
  const completion = COMPLETION_TOOLS[stageId]
  if (completion && items.some((item) => completion.test(item.toolName || '') && item.toolPhase === 'end' && !item.isError)) {
    return 'done'
  }
  if (items.at(-1)?.isError) return 'failed'
  return items.length ? 'running' : 'pending'
}

export function deriveExperimentProgress(items: TimelineItem[]): ExperimentProgress {
  const grouped = new Map<string, TimelineItem[]>()
  for (const item of items) {
    if (item.type !== 'tool-call' || !item.toolName?.startsWith('dpa_')) continue
    const stageId = stageIdFor(item)
    if (!stageId) continue
    grouped.set(stageId, [...(grouped.get(stageId) || []), item])
  }

  const stages = STAGES.map((definition): ExperimentStage => {
    const stageItems = grouped.get(definition.id) || []
    const operations = stageItems.map((item): ExperimentOperation => ({
      id: item.toolCallId || item.id,
      toolName: item.toolName!,
      title: labelForTool(item.toolName!),
      callId: item.toolCallId,
      phase: item.toolPhase,
      args: formatPayload(item.toolArgs),
      result: formatPayload(item.toolOutput || item.toolStatusLine),
      details: formatPayload(item.toolDetails),
      status: statusForItem(item),
      timestamp: item.timestamp,
    }))
    return { ...definition, status: stageStatus(definition.id, stageItems), operations }
  })

  const doneCount = stages.filter((stage) => stage.status === 'done').length
  const failedCount = stages.filter((stage) => stage.status === 'failed').length
  const waitingCount = stages.filter((stage) => stage.status === 'waiting').length
  const percent = Math.round((doneCount / stages.length) * 100)
  const activeStage = stages.find((stage) => stage.status !== 'done')

  return {
    stages,
    stage: activeStage?.title || '实验已完成',
    percent,
    doneCount,
    failedCount,
    waitingCount,
  }
}
