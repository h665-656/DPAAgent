import { useEffect, useState } from 'react'
import { ipcClient } from '@renderer/lib/ipc-client'
import { useUIStore } from '@renderer/stores/ui-store'

export function McpDiagnostics() {
  const workspace = useUIStore((s) => s.currentWorkspace)
  const [exts, setExts] = useState<Array<{ id?: string; packageName?: string; name?: string; compatibility?: string }>>([])

  useEffect(() => {
    if (!workspace) return
    ipcClient.invoke('extensions.list', { workspaceId: workspace }).then((r) => {
      const list = r?.extensions || []
      setExts((list as Array<{ id?: string; packageName?: string; name?: string; compatibility?: string }>).filter((e) => (e.packageName || e.name || '').includes('mcp')))
    })
  }, [workspace])

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/60 bg-muted/15 p-4 text-[12px]">
      <div className="font-medium text-foreground/90">MCP 适配器诊断（只读）</div>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground/80">
        <li>项目级服务器可在「设置 → 插件 → MCP 服务器」中新增、启用或停用。</li>
        <li>桌面写入当前工作区 .mcp.json；连接、认证与工具发现仍由 pi-mcp-adapter 负责。</li>
        <li>全局 MCP 配置与 OAuth 等高级能力仍以扩展文档和 /mcp 命令为准。</li>
      </ul>
      {exts.length > 0 && (
        <div>
          <div className="text-[10px] uppercase text-muted-foreground/50">探测到的包</div>
          {exts.map((e) => (
            <div key={e.id} className="font-mono text-[11px]">
              {e.packageName || e.name} — {e.compatibility}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
