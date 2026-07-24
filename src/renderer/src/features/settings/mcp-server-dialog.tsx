import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { McpServerConfig } from '@shared/ipc-contract'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'

type Transport = 'stdio' | 'http'
type Lifecycle = 'lazy' | 'eager' | 'keep-alive'

function parseStringMap(value: string, label: string): Record<string, string> | undefined {
  if (!value.trim()) return undefined
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || Object.values(parsed).some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be a JSON object with string values`)
  }
  return parsed as Record<string, string>
}

function parseArgs(value: string): string[] | undefined {
  if (!value.trim()) return undefined
  if (value.trim().startsWith('[')) {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      throw new Error('args must be a JSON string array')
    }
    return parsed
  }
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

export function McpServerDialog({
  open,
  onSave,
  onCancel,
}: {
  open: boolean
  onSave: (name: string, config: McpServerConfig) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [transport, setTransport] = useState<Transport>('stdio')
  const [command, setCommand] = useState('npx')
  const [args, setArgs] = useState('')
  const [url, setUrl] = useState('')
  const [variables, setVariables] = useState('')
  const [lifecycle, setLifecycle] = useState<Lifecycle>('lazy')
  const [directTools, setDirectTools] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setTransport('stdio')
    setCommand('npx')
    setArgs('')
    setUrl('')
    setVariables('')
    setLifecycle('lazy')
    setDirectTools(true)
    setBusy(false)
    setError(null)
    const focusTimer = window.setTimeout(() => nameRef.current?.focus(), 0)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onCancel])

  if (!open) return null

  const submit = async () => {
    if (!name.trim()) return setError(t('settings:mcp.nameRequired'))
    if (transport === 'stdio' && !command.trim()) return setError(t('settings:mcp.commandRequired'))
    if (transport === 'http' && !url.trim()) return setError(t('settings:mcp.urlRequired'))
    setBusy(true)
    setError(null)
    try {
      const config: McpServerConfig = { lifecycle, directTools }
      if (transport === 'stdio') {
        config.command = command.trim()
        const parsedArgs = parseArgs(args)
        const env = parseStringMap(variables, 'env')
        if (parsedArgs) config.args = parsedArgs
        if (env) config.env = env
      } else {
        config.url = url.trim()
        const headers = parseStringMap(variables, 'headers')
        if (headers) config.headers = headers
      }
      await onSave(name.trim(), config)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusy(false)
    }
  }

  const fieldClass = 'settings-field-focus w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]'

  return createPortal(
    <div className="electron-no-drag fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4" role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="ui-enter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-xl"
        onPointerDown={(event) => event.stopPropagation()}>
        <h2 id={titleId} className="text-[15px] font-semibold">{t('settings:mcp.addTitle')}</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">{t('settings:mcp.addDescription')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
          {(['stdio', 'http'] as Transport[]).map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 text-[12px] transition-colors',
                transport === item ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setTransport(item)
                setError(null)
              }}
            >
              {item === 'stdio' ? t('settings:mcp.transportStdio') : t('settings:mcp.transportHttp')}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-[11px] font-medium text-foreground/80">
          {t('settings:mcp.name')}
          <input
            ref={nameRef}
            className={`${fieldClass} mt-1`}
            value={name}
            disabled={busy}
            placeholder={t('settings:mcp.namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {transport === 'stdio' ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-foreground/80">
              {t('settings:mcp.command')}
              <input className={`${fieldClass} mt-1 font-mono`} value={command} disabled={busy}
                onChange={(event) => setCommand(event.target.value)} />
            </label>
            <label className="text-[11px] font-medium text-foreground/80">
              {t('settings:mcp.args')}
              <textarea className={`${fieldClass} mt-1 min-h-20 resize-y font-mono`} value={args} disabled={busy}
                placeholder={t('settings:mcp.argsPlaceholder')} onChange={(event) => setArgs(event.target.value)} />
            </label>
          </div>
        ) : (
          <label className="mt-3 block text-[11px] font-medium text-foreground/80">
            {t('settings:mcp.url')}
            <input className={`${fieldClass} mt-1 font-mono`} value={url} disabled={busy}
              placeholder="https://example.com/mcp" onChange={(event) => setUrl(event.target.value)} />
          </label>
        )}
        <label className="mt-3 block text-[11px] font-medium text-foreground/80">
          {transport === 'stdio' ? t('settings:mcp.env') : t('settings:mcp.headers')}
          <textarea className={`${fieldClass} mt-1 min-h-16 resize-y font-mono`} value={variables} disabled={busy}
            placeholder={'{\n  "KEY": "value"\n}'} onChange={(event) => setVariables(event.target.value)} />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-medium text-foreground/80">
            {t('settings:mcp.lifecycle')}
            <select className={`${fieldClass} mt-1`} value={lifecycle} disabled={busy}
              onChange={(event) => setLifecycle(event.target.value as Lifecycle)}>
              <option value="lazy">lazy</option>
              <option value="eager">eager</option>
              <option value="keep-alive">keep-alive</option>
            </select>
          </label>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <div className="text-[11px] font-medium">{t('settings:mcp.directTools')}</div>
              <div className="text-[10px] text-muted-foreground">{t('settings:mcp.directToolsHint')}</div>
            </div>
            <Switch aria-label={t('settings:mcp.directTools')} checked={directTools} disabled={busy} onCheckedChange={setDirectTools} />
          </div>
        </div>
        {error && <p className="mt-3 text-[11px] text-destructive">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} className="rounded-md px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-accent"
            onClick={onCancel}>
            {t('common:cancel')}
          </button>
          <button type="button" disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-[12px] text-primary-foreground disabled:opacity-50"
            onClick={() => void submit()}>
            {busy ? t('settings:mcp.adding') : t('settings:mcp.add')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
