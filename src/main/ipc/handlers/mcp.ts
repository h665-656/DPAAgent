import { configStore } from '../../config-store'
import { workerManager } from '../../worker-manager'
import { registerHandler } from '../registry'
import { listMcpServers, saveMcpServer, setMcpServerEnabled } from '../../mcp-config'

function currentWorkspace(): string | null {
  return workerManager.cwd || configStore.get('currentProject') || null
}

async function reloadWorkerIfNeeded(): Promise<{ workerReloaded: boolean; reloadError?: string }> {
  if (!workerManager.isRunning) return { workerReloaded: false }
  try {
    await workerManager.reloadResources()
    return { workerReloaded: true }
  } catch (error) {
    console.error('[IPC:mcp] Worker resource reload failed:', error)
    return {
      workerReloaded: false,
      reloadError: error instanceof Error ? error.message : String(error),
    }
  }
}

export function registerMcpHandlers(): void {
  registerHandler('ipc:mcp.list', async () => listMcpServers(currentWorkspace()))

  registerHandler('ipc:mcp.save', async (req) => {
    const result = saveMcpServer(currentWorkspace(), req?.name, req?.config, req?.enabled !== false)
    const reload = result.ok ? await reloadWorkerIfNeeded() : { workerReloaded: false }
    return { ...result, ...reload }
  })

  registerHandler('ipc:mcp.setEnabled', async (req) => {
    const enabled = req?.enabled === true
    const result = setMcpServerEnabled(currentWorkspace(), req?.name, enabled)
    const reload = result.ok ? await reloadWorkerIfNeeded() : { workerReloaded: false }
    return { ...result, ...reload }
  })
}
