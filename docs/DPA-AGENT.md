# DPA Desktop Agent（基于 pi-app 套壳）

本仓库（[h665-656/DPAAgent](https://github.com/h665-656/DPAAgent)）从 [justhil/pi-app](https://github.com/justhil/pi-app) 拉取，作为 **DPA 外部桌面 Agent** 壳：

```text
pi Desktop (本仓库)
  → pi-mcp-adapter
  → node F:\Work\DPA-2026\tools\dpa-mcp\server.js
  → 本机 DPA ExternalAgentBridge
  → ToolRegistry（操作 DPA）
```

## 前置条件

| 项 | 说明 |
|----|------|
| Node.js | ≥ 22.19（`package.json` engines） |
| DPA | 能启动，并加载 `AIAssistantService`（写出 bridge 配置） |
| 模型 | 本机 pi 已完成模型登录（`~/.pi/agent` 与 CLI 共用） |
| MCP 服务 | `F:\Work\DPA-2026\tools\dpa-mcp\server.js` |

Bridge 配置默认路径：

`%LOCALAPPDATA%\DPA\AIAssistant\external-agent-bridge.json`

## 一键配置（推荐）

在仓库根目录 PowerShell：

```powershell
cd <本仓库根目录>
.\scripts\setup-dpa-agent.ps1
```

脚本会：

1. 全局安装 `@earendil-works/pi-coding-agent`（若尚未安装）
2. `pi install npm:pi-mcp-adapter`
3. 将 `.mcp.json` 和 `AGENTS.md` 安装到 `F:\Work\DPA-2026`（已有文件不覆盖）
4. 合并/写入用户级 MCP 回退配置（可选）
5. 提示安装本仓库 `npm install` 与 `npm run dev`

## 手动步骤

### 1. 安装 pi CLI

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
pi --version
```

完成模型登录（与官方 pi 相同）。

### 2. 安装 MCP 适配扩展

```powershell
pi install npm:pi-mcp-adapter
```

确认 `~/.pi/agent/settings.json` 的 `packages` 中已启用该包（`pi config` 可管理）。

### 3. 项目 MCP 配置

本仓库已提供 **[`.mcp.json`](../.mcp.json)**，将 `dpa` 指到：

```text
node F:/Work/DPA-2026/tools/dpa-mcp/server.js
```

并设置：

- `DPA_LAUNCHER_PATH` → Debug `Launcher.exe`（可按你的实际路径改）
- `directTools: true` → 模型直接看到 `dpa_*` 工具
- `requestTimeoutMs: 90000` → 对齐 DPA 侧超时

若 DPA 安装路径不同，只改 `.mcp.json` 里 `args` / `env`。

### 4. 启动桌面壳

```powershell
cd <本仓库根目录>
npm install
npm run dev
```

打开工作区时选择 **`F:\Work\DPA-2026`**。项目级 MCP 配置由工作目录决定，脚本会把 `.mcp.json` 和 `AGENTS.md` 安装到该目录；配置后需要新建会话或重启对应 Worker。

### 5. 验证

1. 启动 DPA（或让 Agent 调 `dpa_ensure_running`）
2. 新会话中发送：

```text
先 dpa_ensure_running，再 dpa_get_app_context，用中文总结当前页面、项目与采集状态。
```

3. 若工具未出现：终端确认 `pi-mcp-adapter` 已装；**新建会话**；桌面 **设置 → 扩展** 查看；可试 `/mcp reconnect dpa`

首次加入启用 `directTools` 的 Server 时，Adapter 会先建立 `~/.pi/agent/mcp-cache.json`；缓存完成后需再新建会话或重启工作区 Worker，`dpa_*` 才会作为原生工具注册。

## 人设

- 仓库根 [`AGENTS.md`](../AGENTS.md)：DPA 实验助手规则  
- 与 pi 机制一致：项目目录下的 AGENTS.md 会进入上下文  

## 与 DPA 进程内 AI 的分工

| | 软件内 AI | 本桌面 Agent |
|--|-----------|--------------|
| 进程 | DPA 内 | 独立 Electron |
| 工具入口 | ToolRegistry 直连 | MCP → bridge → 同一 ToolRegistry |
| 写操作确认 | DPA UI 确认条 | 同样不能绕过，需回 DPA 确认 |
| 定位 | 现场聊天 | 实验编排、跨工具、桌面独立窗口 |

## 换皮（可选，有时间再做）

| 文件 | 用途 |
|------|------|
| `package.json` `name` / `description` | npm 元数据 |
| `electron-builder.yml` `appId` / `productName` | 安装包显示名 |
| `resources/icon.svg` / `build/icon.png` | 图标 |

建议先跑通 MCP，再改品牌，避免与功能调试搅在一起。

## 故障排查

| 现象 | 处理 |
|------|------|
| 读不到 bridge | 先启动 DPA；检查 `%LOCALAPPDATA%\DPA\AIAssistant\external-agent-bridge.json` |
| MCP 起不来 | `node F:\Work\DPA-2026\tools\dpa-mcp\server.js` 单独跑；确认 Node 在 PATH |
| 工具列表空 | `pi install npm:pi-mcp-adapter`；确认实际工作区根目录有 `.mcp.json`；新建会话或重启 Worker |
| `Unexpected token '﻿'` | MCP JSON 带 UTF-8 BOM；转换为 UTF-8 无 BOM，安装脚本已使用无 BOM 写入 |
| Agent 用 `bash` 调 `call-once.js` | 说明原生 MCP 工具未加载；不要把脚本调用当作正常路径，先修复工作区 `.mcp.json` |
| 写工具一直 pending | 回 DPA 点确认；再 `dpa_get_call_status` |
| 采集中改参失败 | 设计联锁，先停采集或只用只读工具 |
| Launcher 找不到 | 改 `.mcp.json` 的 `DPA_LAUNCHER_PATH` 或设系统环境变量 |

## 上游

- 桌面壳：https://github.com/justhil/pi-app  
- Agent 内核：https://github.com/earendil-works/pi  
- MCP 扩展：https://www.npmjs.com/package/pi-mcp-adapter  
- DPA MCP：`F:\Work\DPA-2026\tools\dpa-mcp\`
