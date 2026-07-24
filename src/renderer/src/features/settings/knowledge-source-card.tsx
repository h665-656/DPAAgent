import { RefreshCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { KnowledgeSourceInfo } from '@shared/ipc-contract'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'

export function KnowledgeSourceCard({
  source,
  busy,
  onToggle,
  onReindex,
  onRemove,
}: {
  source: KnowledgeSourceInfo
  busy: boolean
  onToggle: () => void
  onReindex: () => void
  onRemove: () => void
}) {
  const { t, i18n } = useTranslation()
  const indexedAt = source.indexedAt
    ? new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(source.indexedAt))
    : t('settings:knowledge.neverIndexed')

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium">{source.name}</span>
            <span className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium',
              source.enabled
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-muted text-muted-foreground',
            )}>
              {source.enabled
                ? t('settings:knowledge.enabled')
                : t('settings:knowledge.disabled')}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70" title={source.path}>
            {source.path}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <span>{t('settings:knowledge.fileCount', { count: source.fileCount })}</span>
            <span>{t('settings:knowledge.chunkCount', { count: source.chunkCount })}</span>
            <span>{t('settings:knowledge.indexedAt', { time: indexedAt })}</span>
          </div>
          {source.error ? (
            <div className="mt-2 rounded-md bg-destructive/8 px-2 py-1.5 text-[10px] text-destructive">
              {source.error}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            title={t('settings:knowledge.reindex')}
            disabled={busy}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-accent disabled:opacity-40"
            onClick={onReindex}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
          </button>
          <button
            type="button"
            title={t('settings:knowledge.removeHint')}
            disabled={busy}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <Switch
            aria-label={t('settings:knowledge.toggleSource', { name: source.name })}
            checked={source.enabled}
            disabled={busy}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
    </div>
  )
}
