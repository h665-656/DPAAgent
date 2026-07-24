# DPA Agent

基于 [pi Desktop](https://github.com/justhil/pi-app) 的 **DPA 外部桌面实验助手**：用 MCP 连接本机 DPA，通过 `dpa_*` 工具做可重复实验、查状态、配设备/通道、创建与调整分析。

```text
pi Desktop (本仓库)
  → pi-mcp-adapter
  → node <DPA>/tools/dpa-mcp/server.js
  → DPA ExternalAgentBridge
  → ToolRegistry
```

[详细说明](./docs/DPA-AGENT.md) · [Agent 人设](./AGENTS.md) · [上游 README（英文）](./README.upstream.md) · [上游 README（中文）](./README.zh-CN.md)

## 快速开始

```powershell
# 克隆
git clone https://github.com/h665-656/DPAAgent.git
cd DPAAgent

# 一键配置（安装 pi CLI、pi-mcp-adapter，并写入 DPA 工作区 MCP/人设）
.\scripts\setup-dpa-agent.ps1

# 启动桌面壳
npm install
npm run dev
```

打开工作区时选择你的 **DPA 工程目录**（脚本默认 `F:\Work\DPA-2026`，可按本机路径修改）。

### 本机路径

默认 MCP 配置见 [`.mcp.json`](./.mcp.json)。若 DPA 不在默认路径，请改：

| 配置项 | 含义 |
|--------|------|
| `mcpServers.dpa.args` | `dpa-mcp/server.js` 绝对路径 |
| `env.DPA_LAUNCHER_PATH` | `Launcher.exe` 绝对路径 |

也可在运行 setup 时传入：

```powershell
.\scripts\setup-dpa-agent.ps1 `
  -DpaWorkspace "D:\path\to\DPA-2026" `
  -DpaMcpServer "D:\path\to\DPA-2026\tools\dpa-mcp\server.js" `
  -DpaLauncher "D:\path\to\DPA-2026\x64\Debug\Launcher.exe"
```

## 验证

新会话中发送：

```text
先 dpa_ensure_running，再 dpa_get_app_context，用中文总结当前页面、项目与采集状态。
```

## 本仓库相对上游新增

| 路径 | 作用 |
|------|------|
| [`.mcp.json`](./.mcp.json) | 连接本机 DPA MCP |
| [`AGENTS.md`](./AGENTS.md) | DPA 实验助手人设 |
| [`docs/DPA-AGENT.md`](./docs/DPA-AGENT.md) | 架构、安装、排错 |
| [`scripts/setup-dpa-agent.ps1`](./scripts/setup-dpa-agent.ps1) | 一键安装与工作区配置 |
| 本 `README.md` | 仓库首页 |

桌面壳源码、扩展适配器与上游文档仍来自 [justhil/pi-app](https://github.com/justhil/pi-app)。

## 要求

| 项 | 说明 |
|----|------|
| Node.js | ≥ 22.19 |
| DPA | 可启动，并加载 AIAssistant bridge |
| 模型 | 本机 pi 已完成模型登录（`~/.pi/agent`） |
| MCP | 本机存在 `tools/dpa-mcp/server.js` |

## 故障排查（摘要）

| 现象 | 处理 |
|------|------|
| 读不到 bridge | 先启动 DPA；检查 `%LOCALAPPDATA%\DPA\AIAssistant\external-agent-bridge.json` |
| 工具列表空 | 安装 `pi-mcp-adapter`；确认工作区根有 `.mcp.json`；**新建会话** |
| 写操作一直 pending | 回 DPA 界面点确认；再查 `dpa_get_call_status` |
| Launcher 找不到 | 改 `.mcp.json` 的 `DPA_LAUNCHER_PATH` |

完整排错见 [docs/DPA-AGENT.md](./docs/DPA-AGENT.md)。

## 上游

- 桌面壳：https://github.com/justhil/pi-app  
- Agent 内核：https://github.com/earendil-works/pi  
- MCP 扩展：https://www.npmjs.com/package/pi-mcp-adapter  
