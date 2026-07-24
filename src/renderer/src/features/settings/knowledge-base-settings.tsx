import { useCallback, useEffect, useState } from 'react'
import { BookOpenText, Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type {
  KnowledgeListResponse,
  KnowledgeSearchResultInfo,
  KnowledgeSourceInfo,
} from '@shared/ipc-contract'
import { ipcClient } from '@renderer/lib/ipc-client'
import { cn } from '@renderer/lib/utils'
import { SettingsPageHeader } from './settings-shell'
import { KnowledgeSearchTest } from './knowledge-search-test'
import { KnowledgeSourcesList } from './knowledge-sources-list'

export function KnowledgeBaseSettings() {
  const { t } = useTranslation()
  const [result, setResult] = useState<KnowledgeListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResultInfo[] | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await ipcClient.invoke('knowledge.list'))
    } catch (error) {
      setResult({ ok: false, sources: [], error: String(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const addDirectory = async () => {
    setAdding(true)
    try {
      const response = await ipcClient.invoke('knowledge.addDirectory')
      if (response?.canceled) return
      if (!response?.ok) throw new Error(response?.error || t('common:operationFailed'))
      toast.success(t('settings:knowledge.added'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common:operationFailed'))
      await refresh()
    } finally {
      setAdding(false)
    }
  }

  const mutateSource = async (method: string, source: KnowledgeSourceInfo, request: object, message: string) => {
    setBusyId(source.id)
    try {
      const response = await ipcClient.invoke(method, request)
      if (!response?.ok) throw new Error(response?.error || t('common:operationFailed'))
      toast.success(message)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common:operationFailed'))
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const response = await ipcClient.invoke('knowledge.search', { query, limit: 8 })
      if (!response?.ok) throw new Error(response?.error || t('common:operationFailed'))
      setSearchResults(response.results || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common:operationFailed'))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="w-full">
      <SettingsPageHeader title={t('settings:knowledge.title')} description={t('settings:knowledge.description')} action={(
        <div className="flex items-center gap-2">
          <button type="button" title={t('settings:knowledge.refresh')} disabled={loading}
            className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-accent disabled:opacity-50"
            onClick={() => void refresh()}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button type="button" disabled={adding || result?.error === 'no_workspace'}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => void addDirectory()}>
            <Plus className="h-3.5 w-3.5" />
            {adding ? t('settings:knowledge.indexing') : t('settings:knowledge.addDirectory')}
          </button>
        </div>
      )} />
      <div className="mb-4 flex gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] text-muted-foreground">
        <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{t('settings:knowledge.agentHint')}</span>
      </div>
      {result?.databasePath ? <div className="mb-3 truncate font-mono text-[10px] text-muted-foreground/55" title={result.databasePath}>{result.databasePath}</div> : null}
      <KnowledgeSourcesList result={result} loading={loading} busyId={busyId}
        onToggle={(source) => void mutateSource('knowledge.setEnabled', source, { id: source.id, enabled: !source.enabled }, source.enabled ? t('settings:knowledge.disabledToast') : t('settings:knowledge.enabledToast'))}
        onReindex={(source) => void mutateSource('knowledge.reindex', source, { id: source.id }, t('settings:knowledge.reindexed'))}
        onRemove={(source) => {
          if (window.confirm(t('settings:knowledge.removeConfirm', { name: source.name }))) {
            void mutateSource('knowledge.remove', source, { id: source.id }, t('settings:knowledge.removed'))
          }
        }} />
      {result?.ok ? <KnowledgeSearchTest query={query} results={searchResults} searching={searching}
        onQueryChange={(value) => { setQuery(value); setSearchResults(null) }} onSearch={() => void search()} /> : null}
    </div>
  )
}
