import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, ServerCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { McpListResponse, McpServerConfig, McpServerInfo } from '@shared/ipc-contract'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import { ipcClient } from '@renderer/lib/ipc-client'
import { McpServerDialog } from './mcp-server-dialog'

function serverEndpoint(server: McpServerInfo): string {
  const command = typeof server.config.command === 'string' ? server.config.command : ''
  if (command) {
    const args = Array.isArray(server.config.args) ? server.config.args.filter((item) => typeof item === 'string') : []
    return [command, ...args].join(' ')
  }
  const value = typeof server.config.url === 'string' ? server.config.url : ''
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value
  }
}

export function McpServersPanel() {
  const { t } = useTranslation()
  const [result, setResult] = useState<McpListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [togglingName, setTogglingName] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await ipcClient.invoke('mcp.list'))
    } catch (error) {
      setResult({ ok: false, configPath: null, servers: [], parseError: String(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const toggleServer = async (server: McpServerInfo) => {
    const enabled = !server.enabled
    setTogglingName(server.name)
    try {
      const response = await ipcClient.invoke('mcp.setEnabled', { name: server.name, enabled })
      if (!response?.ok) throw new Error(response?.error || t('common:operationFailed'))
      if (response.reloadError) toast.warning(t('settings:mcp.reloadFailed'))
      else toast.success(enabled ? t('settings:mcp.enabledToast') : t('settings:mcp.disabledToast'))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common:operationFailed'))
    } finally {
      setTogglingName(null)
    }
  }

  const saveServer = async (name: string, config: McpServerConfig) => {
    const response = await ipcClient.invoke('mcp.save', { name, config, enabled: true })
    if (!response?.ok) throw new Error(response?.error || t('common:saveFailed'))
    if (response.reloadError) toast.warning(t('settings:mcp.reloadFailed'))
    else toast.success(t('settings:mcp.addedToast', { name }))
    setDialogOpen(false)
    await refresh()
  }

  const servers = result?.servers ?? []

  return (
    <section className="mt-6 border-t border-border/50 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <ServerCog className="h-4 w-4 text-primary" />
            {t('settings:mcp.title')}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/75">{t('settings:mcp.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={t('settings:mcp.refresh')} disabled={loading}
            className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-accent disabled:opacity-50"
            onClick={() => void refresh()}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button type="button" disabled={!result?.ok || loading} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[12px] font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('settings:mcp.addServer')}
          </button>
        </div>
      </div>
      {result?.configPath && (
        <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground/55" title={result.configPath}>
          {result.configPath}
        </div>
      )}
      {result?.parseError && result.parseError !== 'no_workspace' && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-destructive">
          {t('settings:mcp.parseError')}: {result.parseError}
        </div>
      )}
      {result?.parseError === 'no_workspace' ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/60 p-5 text-center text-[12px] text-muted-foreground/60">
          {t('settings:mcp.workspaceRequired')}
        </div>
      ) : loading && !result ? (
        <div className="py-6 text-[12px] text-muted-foreground/50">{t('settings:mcp.loading')}</div>
      ) : servers.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-border/60 p-5 text-center text-[12px] text-muted-foreground/60">
          {t('settings:mcp.empty')}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {servers.map((server) => {
            const transport = typeof server.config.command === 'string' ? 'stdio' : 'HTTP'
            const lifecycle = typeof server.config.lifecycle === 'string' ? server.config.lifecycle : 'lazy'
            return (
              <div key={server.name} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{server.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">{transport}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{lifecycle}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70" title={serverEndpoint(server)}>
                      {serverEndpoint(server)}
                    </div>
                    <div className={cn(
                      'mt-2 flex items-center gap-1.5 text-[10px]',
                      !server.enabled ? 'text-muted-foreground' : server.toolCount > 0 ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-300',
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {!server.enabled
                        ? t('settings:mcp.statusDisabled')
                        : server.toolCount > 0
                          ? t('settings:mcp.statusReady', { count: server.toolCount })
                          : t('settings:mcp.statusPending')}
                    </div>
                  </div>
                  <Switch aria-label={t('settings:mcp.toggleServer', { name: server.name })}
                    checked={server.enabled} disabled={togglingName === server.name}
                    onCheckedChange={() => void toggleServer(server)} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <McpServerDialog open={dialogOpen} onSave={saveServer} onCancel={() => setDialogOpen(false)} />
    </section>
  )
}
