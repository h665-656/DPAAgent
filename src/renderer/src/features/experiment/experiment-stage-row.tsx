import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, Circle, Clock3, LoaderCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { ExperimentStage, ExperimentStepStatus } from './experiment-progress'

const STATUS_VIEW: Record<ExperimentStepStatus, {
  label: string
  icon: typeof Circle
  className: string
}> = {
  pending: { label: '未开始', icon: Circle, className: 'text-foreground-secondary/55' },
  running: { label: '进行中', icon: LoaderCircle, className: 'text-blue-500' },
  waiting: { label: '待确认', icon: Clock3, className: 'text-amber-500' },
  done: { label: '已完成', icon: Check, className: 'text-emerald-500' },
  failed: { label: '失败', icon: AlertCircle, className: 'text-red-500' },
}

function EmptyDetail({ stage }: { stage: ExperimentStage }) {
  const message = stage.id === 'acquisition'
    ? '采集启停与存盘受 DPA 联锁控制，执行后由采集状态自动更新。'
    : '尚未执行此阶段的操作。'
  return <div className='rounded-md bg-[var(--bg-hover)] px-3 py-2 text-[11px] text-foreground-secondary'>{message}</div>
}

function formatOperationTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function OperationPayload({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className='mt-2'>
      <div className='text-[9px] font-medium text-foreground-secondary'>{label}</div>
      <pre className='mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-[var(--bg-hover)] p-2 font-mono text-[10px] leading-relaxed text-foreground-secondary'>
        {value}
      </pre>
    </div>
  )
}

export function ExperimentStageRow({ stage, index }: { stage: ExperimentStage; index: number }) {
  const [expanded, setExpanded] = useState(stage.status !== 'pending')
  const view = STATUS_VIEW[stage.status]
  const Icon = view.icon
  return (
    <section className='relative pb-3 last:pb-0'>
      <button type='button' onClick={() => setExpanded((value) => !value)}
        className='relative z-10 flex w-full items-start gap-3 rounded-lg px-1 py-2 text-left hover:bg-[var(--bg-hover)]'>
        <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--bg-base)]'>
          {stage.status === 'pending' ? <span className='text-[10px] tabular-nums text-foreground-secondary'>{index + 1}</span>
            : <Icon className={cn('h-3.5 w-3.5', view.className, stage.status === 'running' && 'animate-spin')} />}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-[13px] font-medium text-foreground'>{stage.title}</span>
            <span className={cn('shrink-0 text-[10px]', view.className)}>{view.label}</span>
          </div>
          <div className='mt-0.5 text-[11px] leading-relaxed text-foreground-secondary'>{stage.description}</div>
        </div>
        <ChevronDown className={cn('mt-1 h-3.5 w-3.5 shrink-0 text-foreground-secondary transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className='ml-10 mt-1 space-y-2 pr-1'>
          {stage.operations.length === 0 ? <EmptyDetail stage={stage} /> : stage.operations.map((operation, operationIndex) => {
            const operationView = STATUS_VIEW[operation.status]
            return (
              <div key={operation.id} className='rounded-lg border border-border/60 bg-[var(--surface-sidebar)] p-2.5'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='min-w-0 text-[11px] font-medium text-foreground'>
                    {operationIndex + 1}. {operation.title}
                  </span>
                  <span className={cn('text-[9px]', operationView.className)}>{operationView.label}</span>
                </div>
                <div className='mt-1.5 space-y-0.5 text-[9px] leading-relaxed text-foreground-secondary'>
                  <div>{formatOperationTime(operation.timestamp)}</div>
                  <div className='break-all font-mono'>{operation.toolName}</div>
                  {operation.callId && <div className='break-all font-mono'>调用 ID：{operation.callId}</div>}
                  {operation.phase && <div>调用阶段：{operation.phase}</div>}
                </div>
                <OperationPayload label='操作参数' value={operation.args} />
                <OperationPayload label='执行结果' value={operation.result} />
                <OperationPayload label='附加详情' value={operation.details} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
