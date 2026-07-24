import { Activity, PanelRightOpen } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui-store'
import { useTranslation } from 'react-i18next'

/**
 * Collapsed right rail: panel icons only (no run-status green pulse).
 */
export function RightPanelCollapsedRail() {
  const { t } = useTranslation()
  const collapsed = useUIStore((s) => s.rightPanelCollapsed)
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel)

  if (!collapsed) return null

  return (
    <aside
      className="right-collapsed-rail electron-no-drag flex h-full w-10 shrink-0 flex-col items-center border-l border-border/40 py-2"
      style={{ background: 'color-mix(in srgb, var(--bg-base) 96%, var(--surface-sidebar))' }}
      aria-label={t('common:topbar.expandRightPanel')}
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden px-1">
        <button
          type="button"
          title="实验进程"
          onClick={toggleRightPanel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-active)] text-foreground"
        >
          <Activity className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        type="button"
        title={t('common:topbar.expandRightPanel')}
        onClick={() => toggleRightPanel()}
        className="chrome-icon-btn mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-foreground-secondary"
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
      </button>
    </aside>
  )
}
