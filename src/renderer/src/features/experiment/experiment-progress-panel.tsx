import { FlaskConical } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui-store'
import { deriveExperimentProgress } from './experiment-progress'
import { ExperimentStageRow } from './experiment-stage-row'

function formatRecordTime(timestamp: number | undefined): string {
  if (!timestamp) return '--'
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function ProgressHeader({ title, sessionId, stage, percent, doneCount, failedCount, waitingCount, total, operationCount, startedAt, updatedAt }: {
  title: string
  sessionId: string
  stage: string
  percent: number
  doneCount: number
  failedCount: number
  waitingCount: number
  total: number
  operationCount: number
  startedAt?: number
  updatedAt?: number
}) {
  return (
    <div className='border-b border-border/50 px-4 py-4'>
      <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
        <FlaskConical className='h-4 w-4 text-brand' />
        实验进程记录
      </div>
      <div className='mt-2 truncate text-[15px] font-semibold text-foreground' title={title}>{title}</div>
      <div className='mt-0.5 truncate font-mono text-[9px] text-foreground-secondary' title={sessionId}>
        试验 ID：{sessionId}
      </div>
      <div className='mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-secondary'>
        <span>首个操作：{formatRecordTime(startedAt)}</span>
        <span>最近操作：{formatRecordTime(updatedAt)}</span>
      </div>
      <div className='mt-3 flex items-end justify-between gap-3'>
        <div>
          <div className='text-[11px] text-foreground-secondary'>当前阶段</div>
          <div className='mt-0.5 text-[14px] font-medium text-foreground'>{stage}</div>
        </div>
        <div className='text-right text-[11px] tabular-nums text-foreground-secondary'>
          {doneCount} / {total} 阶段 · {percent}%
        </div>
      </div>
      <div className='mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]'>
        <div className='h-full rounded-full bg-brand transition-[width] duration-500'
          style={{ width: `${percent}%` }} />
      </div>
      <div className='mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tabular-nums text-foreground-secondary'>
        <span>操作 {operationCount}</span>
        <span>待确认 {waitingCount}</span>
        <span>失败 {failedCount}</span>
      </div>
    </div>
  )
}

export function ExperimentProgressPanel() {
  const items = useUIStore((state) => state.timelineItems)
  const runStatus = useUIStore((state) => state.runState.status)
  const currentSessionId = useUIStore((state) => state.currentSessionId)
  const sessionTitle = useUIStore((state) =>
    state.sessions.find((session) => session.sessionId === state.currentSessionId)?.title
  )
  const progress = deriveExperimentProgress(items)
  const operations = progress.stages.flatMap((stage) => stage.operations)
  const orderedOperations = [...operations].sort((left, right) => left.timestamp - right.timestamp)
  const fallbackTitle = items.find((item) => item.type === 'user-message')?.text?.trim()
  const title = sessionTitle || fallbackTitle || '当前试验'

  return (
    <aside className='flex h-full min-h-0 flex-col bg-[var(--bg-base)]'>
      <ProgressHeader
        title={title}
        sessionId={currentSessionId || ''}
        stage={progress.stage}
        percent={progress.percent}
        doneCount={progress.doneCount}
        failedCount={progress.failedCount}
        waitingCount={progress.waitingCount}
        total={progress.stages.length}
        operationCount={operations.length}
        startedAt={orderedOperations.at(0)?.timestamp}
        updatedAt={orderedOperations.at(-1)?.timestamp}
      />
      <div className='flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4'>
        <div className='relative'>
          <div className='absolute bottom-5 left-[18px] top-5 w-px bg-border/70' />
          {progress.stages.map((stage, index) => (
            <ExperimentStageRow key={stage.id} stage={stage} index={index} />
          ))}
        </div>
      </div>
      <div className='border-t border-border/50 px-4 py-2.5 text-[10px] text-foreground-secondary'>
        {runStatus === 'running' ? 'Agent 正在推进当前阶段' : '展开阶段可查看实际参数与执行结果'}
      </div>
    </aside>
  )
}
