import { test, expect, _electron as electron } from '@playwright/test'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const electronExecutable = require('electron') as string
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

test('shows progress records only for an opened experiment', async () => {
  const app = await electron.launch({
    executablePath: electronExecutable,
    args: [path.join(root, 'out/main/index.js')],
    env: {
      ...process.env,
      PI_E2E: '1',
      ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
      ELECTRON_NO_ATTACH_CONSOLE: '1',
    },
    timeout: 60_000,
  })

  try {
    const window = await app.firstWindow({ timeout: 45_000 })
    await window.waitForLoadState('domcontentloaded', { timeout: 45_000 })
    await window.setViewportSize({ width: 1200, height: 800 })
    await expect(window.getByText('DPA 实验助手')).toBeVisible()

    const progressTitle = window.getByText('实验进程记录', { exact: true })
    await expect(progressTitle).toHaveCount(0)
    await window.screenshot({ path: 'F:/tmp/dpa-home-without-progress.png', fullPage: true })

    const recent = await window.evaluate(() =>
      window.piDesktop?.invoke('ipc:settings.get', { key: 'recentProjects' })
    ) as { settings?: { recentProjects?: string[] } }
    const workspacePath = recent?.settings?.recentProjects?.find(
      (candidate) => !candidate.includes('sandbox-workspaces')
    ) || root
    await app.evaluate(({ dialog }, selectedPath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selectedPath] })
    }, workspacePath)
    await window.getByRole('button', { name: '打开实验工作区' }).click()

    const firstExperiment = window.locator('.sidebar-session-tree [role="button"]').first()
    const hasExperiment = await firstExperiment
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false)
    if (!hasExperiment) return

    await firstExperiment.click()
    await expect(progressTitle).toBeVisible()
    await expect(window.getByText('试验 ID：', { exact: false })).toBeVisible()
    await expect(window.getByText(/操作 \d+/)).toBeVisible()
    for (const stage of ['设备连接', '参数配置', '试验采集与存储', '数据分析', '结果与报告导出']) {
      await expect(window.getByRole('button', { name: new RegExp(stage) })).toBeVisible()
    }
    await window.getByRole('button', { name: /参数配置/ }).click()
    await expect(window.getByText('尚未执行此阶段的操作。')).toBeVisible()
    await window.screenshot({ path: 'F:/tmp/dpa-experiment-record.png', fullPage: true })
  } finally {
    await app.close()
  }
})
