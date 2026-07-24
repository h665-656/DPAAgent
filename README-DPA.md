# DPA Agent（pi-app 套壳）

本仓库 = [pi-app](https://github.com/justhil/pi-app) + **DPA MCP 配置与人设**。

## 快速开始

```powershell
cd F:\AI\2026\AIagent
.\scripts\setup-dpa-agent.ps1
npm run dev
```

详细说明见 **[docs/DPA-AGENT.md](./docs/DPA-AGENT.md)**。

## 本仓库相对上游新增

| 路径 | 作用 |
|------|------|
| `.mcp.json` | 连接 `F:\Work\DPA-2026\tools\dpa-mcp\server.js` |
| `AGENTS.md` | DPA 实验助手人设 |
| `docs/DPA-AGENT.md` | 架构、安装、排错 |
| `scripts/setup-dpa-agent.ps1` | 安装 pi CLI、`pi-mcp-adapter`，并向 DPA 工作区安装 MCP 配置与 Agent 指令 |
| `README-DPA.md` | 本页 |

上游 README 仍见 [README.md](./README.md) / [README.zh-CN.md](./README.zh-CN.md)。

## 验证一句话

> 先 `dpa_ensure_running`，再 `dpa_get_app_context`，用中文总结当前页面与项目。
