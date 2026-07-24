import { useTranslation } from 'react-i18next'
import type { KnowledgeListResponse, KnowledgeSourceInfo } from '@shared/ipc-contract'
import { KnowledgeSourceCard } from './knowledge-source-card'

export function KnowledgeSourcesList({
  result,
  loading,
  busyId,
  onToggle,
  onReindex,
  onRemove,
}: {
  result: KnowledgeListResponse | null
  loading: boolean
  busyId: string | null
  onToggle: (source: KnowledgeSourceInfo) => void
  onReindex: (source: KnowledgeSourceInfo) => void
  onRemove: (source: KnowledgeSourceInfo) => void
}) {
  const { t } = useTranslation()
  if (result?.error === 'no_workspace') {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-[12px] text-muted-foreground">
        {t('settings:knowledge.workspaceRequired')}
      </div>
    )
  }
  if (loading && !result) {
    return <div className="py-8 text-[12px] text-muted-foreground">{t('settings:knowledge.loading')}</div>
  }
  if (result && !result.ok) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive">
        {result.error || t('common:operationFailed')}
      </div>
    )
  }
  if (!result?.sources.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-[12px] text-muted-foreground">
        {t('settings:knowledge.empty')}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {result.sources.map((source) => (
        <KnowledgeSourceCard
          key={source.id}
          source={source}
          busy={busyId === source.id}
          onToggle={() => onToggle(source)}
          onReindex={() => onReindex(source)}
          onRemove={() => onRemove(source)}
        />
      ))}
    </div>
  )
}
