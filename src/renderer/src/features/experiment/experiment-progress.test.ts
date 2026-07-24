import { describe, expect, it } from 'vitest'
import type { TimelineItem } from '@renderer/stores/ui-store-types'
import { deriveExperimentProgress, isExperimentSessionOpen } from './experiment-progress'

function tool(overrides: Partial<TimelineItem>): TimelineItem {
  return {
    id: overrides.id || 'tool-1',
    type: 'tool-call',
    toolName: 'dpa_get_app_context',
    toolCallId: overrides.toolCallId || 'call-1',
    toolPhase: 'end',
    timestamp: overrides.timestamp || 1,
    ...overrides,
  }
}

describe('deriveExperimentProgress', () => {
  it('始终返回五个固定实验阶段', () => {
    const progress = deriveExperimentProgress([])

    expect(progress.stages.map((stage) => stage.title)).toEqual([
      '设备连接', '参数配置', '试验采集与存储', '数据分析', '结果与报告导出',
    ])
    expect(progress.stages.every((stage) => stage.status === 'pending')).toBe(true)
    expect(progress.stage).toBe('设备连接')
    expect(progress.percent).toBe(0)
  })

  it('连接设备后完成第一阶段', () => {
    const progress = deriveExperimentProgress([
      tool({ toolName: 'dpa_connect_device', toolArgs: { sn: 'DPA-001' } }),
    ])

    expect(progress.stages[0].status).toBe('done')
    expect(progress.stages[0].operations[0].args).toContain('DPA-001')
    expect(progress.percent).toBe(20)
  })

  it('识别等待 DPA 确认的步骤', () => {
    const progress = deriveExperimentProgress([
      tool({
        toolName: 'dpa_create_analysis',
        toolOutput: '{"status":"confirmation_required"}',
      }),
    ])

    expect(progress.stages[3].status).toBe('waiting')
    expect(progress.waitingCount).toBe(1)
    expect(progress.percent).toBe(0)
  })

  it('参数配置阶段保留具体通道参数', () => {
    const progress = deriveExperimentProgress([
      tool({
        toolName: 'dpa_set_daq_channel_param',
        toolArgs: { channelId: 3, params: { SamplingRate: '12800', IsStorage: true } },
      }),
    ])

    expect(progress.stages[1].status).toBe('done')
    expect(progress.stages[1].operations[0].args).toContain('SamplingRate')
    expect(progress.stages[1].operations[0].args).toContain('12800')
  })

  it('采集运行后停止会完成采集与存储阶段', () => {
    const progress = deriveExperimentProgress([
      tool({ id: 'running', toolCallId: 'running', toolName: 'dpa_get_daq_status', toolOutput: '{"running":true,"saving":true}', timestamp: 1 }),
      tool({ id: 'stopped', toolCallId: 'stopped', toolName: 'dpa_get_daq_status', toolOutput: '{"running":false,"saving":false}', timestamp: 2 }),
    ])

    expect(progress.stages[2].status).toBe('done')
  })

  it('失败操作不会被计为阶段完成', () => {
    const progress = deriveExperimentProgress([
      tool({ toolName: 'dpa_find_devices', isError: true }),
    ])

    expect(progress.stages[0].status).toBe('failed')
    expect(progress.failedCount).toBe(1)
    expect(progress.percent).toBe(0)
  })

  it('导出分析记录归入最后阶段', () => {
    const progress = deriveExperimentProgress([
      tool({ toolName: 'dpa_export_record', toolArgs: { directory: 'F:/data/report' } }),
    ])

    expect(progress.stages[4].status).toBe('done')
    expect(progress.stages[4].operations[0].args).toContain('F:/data/report')
  })

  it('保留操作标识、原始阶段和附加详情', () => {
    const progress = deriveExperimentProgress([
      tool({
        toolCallId: 'call-detail-1',
        toolName: 'dpa_connect_device',
        toolDetails: { transport: 'tcp', retries: 2 },
      }),
    ])

    expect(progress.stages[0].operations[0]).toMatchObject({
      callId: 'call-detail-1',
      phase: 'end',
    })
    expect(progress.stages[0].operations[0].details).toContain('transport')
  })
})

describe('isExperimentSessionOpen', () => {
  const concreteSession = {
    currentSessionId: 'experiment-1',
    historySessionFile: 'F:/experiments/experiment-1.jsonl',
    ephemeralSandboxDraft: false,
    pendingNewSessionPlaceholder: false,
  }

  it('仅在真实试验会话及其记录文件都已绑定时返回 true', () => {
    expect(isExperimentSessionOpen(concreteSession)).toBe(true)
    expect(isExperimentSessionOpen({ ...concreteSession, currentSessionId: null })).toBe(false)
    expect(isExperimentSessionOpen({ ...concreteSession, historySessionFile: null })).toBe(false)
  })

  it('排除临时草稿和待创建试验', () => {
    expect(isExperimentSessionOpen({ ...concreteSession, ephemeralSandboxDraft: true })).toBe(false)
    expect(isExperimentSessionOpen({ ...concreteSession, pendingNewSessionPlaceholder: true })).toBe(false)
  })
})
