import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import { configStore } from '../../config-store'
import { workerManager } from '../../worker-manager'
import { knowledgeDatabasePath } from '../../../knowledge/knowledge-db'
import {
  addKnowledgeSource,
  listKnowledgeSources,
  reindexKnowledgeSource,
  removeKnowledgeSource,
  searchKnowledgeBase,
  setKnowledgeSourceEnabled,
} from '../../../knowledge/knowledge-service'
import { registerHandler } from '../registry'

function currentWorkspace(): string | null {
  return workerManager.cwd || configStore.get('currentProject') || null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function mutate(
  operation: (workspacePath: string) => unknown | Promise<unknown>,
): Promise<Record<string, unknown>> {
  const workspacePath = currentWorkspace()
  if (!workspacePath) return { ok: false, error: 'no_workspace' }
  try {
    const source = await operation(workspacePath)
    return { ok: true, source }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

export function registerKnowledgeHandlers(): void {
  registerHandler('ipc:knowledge.list', async () => {
    const workspacePath = currentWorkspace()
    if (!workspacePath) return { ok: false, sources: [], error: 'no_workspace' }
    try {
      return {
        ok: true,
        databasePath: knowledgeDatabasePath(workspacePath),
        sources: listKnowledgeSources(workspacePath),
      }
    } catch (error) {
      return { ok: false, sources: [], error: errorMessage(error) }
    }
  })

  registerHandler('ipc:knowledge.addDirectory', async () => {
    const workspacePath = currentWorkspace()
    if (!workspacePath) return { ok: false, error: 'no_workspace' }
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const options: OpenDialogOptions = { properties: ['openDirectory'], title: '选择知识库目录' }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths.length) return { ok: true, canceled: true }
    try {
      const source = await addKnowledgeSource(workspacePath, result.filePaths[0])
      return { ok: true, source }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  registerHandler('ipc:knowledge.setEnabled', async (req) => {
    return mutate((workspace) => setKnowledgeSourceEnabled(workspace, req?.id, req?.enabled === true))
  })

  registerHandler('ipc:knowledge.remove', async (req) => {
    const workspacePath = currentWorkspace()
    if (!workspacePath) return { ok: false, error: 'no_workspace' }
    try {
      const removed = removeKnowledgeSource(workspacePath, req?.id)
      return removed ? { ok: true } : { ok: false, error: 'source_not_found' }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  registerHandler('ipc:knowledge.reindex', async (req) => {
    return mutate((workspace) => reindexKnowledgeSource(workspace, req?.id))
  })

  registerHandler('ipc:knowledge.search', async (req) => {
    const workspacePath = currentWorkspace()
    if (!workspacePath) return { ok: false, results: [], error: 'no_workspace' }
    try {
      return {
        ok: true,
        results: searchKnowledgeBase(workspacePath, String(req?.query || ''), req?.limit),
      }
    } catch (error) {
      return { ok: false, results: [], error: errorMessage(error) }
    }
  })
}
