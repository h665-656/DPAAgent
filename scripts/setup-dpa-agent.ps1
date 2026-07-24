#Requires -Version 5.1
<#
.SYNOPSIS
  Prepare this pi-app checkout as the DPA desktop agent shell.

.DESCRIPTION
  - Ensures Node is available
  - Installs @earendil-works/pi-coding-agent globally (if pi missing)
  - Installs pi-mcp-adapter via pi install
  - Installs .mcp.json and AGENTS.md into the DPA workspace when missing
  - Optionally runs npm install in this repo

.EXAMPLE
  .\scripts\setup-dpa-agent.ps1
  .\scripts\setup-dpa-agent.ps1 -SkipNpmInstall
#>
param(
  [switch]$SkipNpmInstall,
  [string]$DpaWorkspace = "F:\Work\DPA-2026",
  [string]$DpaMcpServer = "F:\Work\DPA-2026\tools\dpa-mcp\server.js",
  [string]$DpaLauncher = "F:\Work\DPA-2026\x64\Debug\Launcher.exe"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Write-Utf8NoBom($path, $content) {
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $encoding)
}

Write-Step "Repo: $RepoRoot"

# --- Node ---
Write-Step "Check Node.js"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "node not found in PATH. Install Node.js >= 22.19." }
$nodeVer = (node -v).TrimStart("v")
Write-Ok "node $(node -v) / npm $(npm -v)"
$major = [int]($nodeVer.Split(".")[0])
if ($major -lt 22) {
  Write-Warn "package.json engines require Node >= 22.19; current is $(node -v)"
}

# --- DPA MCP path ---
Write-Step "Check DPA MCP server"
if (-not (Test-Path $DpaMcpServer)) {
  throw "DPA MCP server not found: $DpaMcpServer"
}
Write-Ok $DpaMcpServer
if (-not (Test-Path $DpaLauncher)) {
  Write-Warn "Launcher not found (ensure_running may need path override): $DpaLauncher"
} else {
  Write-Ok "Launcher: $DpaLauncher"
}

$mcpJson = Join-Path $RepoRoot ".mcp.json"
if (-not (Test-Path $mcpJson)) {
  throw ".mcp.json missing in repo root. Re-pull or restore the DPA agent files."
}
Write-Ok ".mcp.json present"

# --- DPA workspace project config ---
Write-Step "Install DPA workspace agent config"
if (-not (Test-Path -LiteralPath $DpaWorkspace -PathType Container)) {
  throw "DPA workspace not found: $DpaWorkspace"
}

$workspaceMcp = Join-Path $DpaWorkspace ".mcp.json"
if (Test-Path -LiteralPath $workspaceMcp) {
  Write-Ok "Workspace .mcp.json already exists (left unchanged): $workspaceMcp"
} else {
  Copy-Item -LiteralPath $mcpJson -Destination $workspaceMcp
  Write-Ok "Installed $workspaceMcp"
}

$agentInstructions = Join-Path $RepoRoot "AGENTS.md"
$workspaceInstructions = Join-Path $DpaWorkspace "AGENTS.md"
if (Test-Path -LiteralPath $workspaceInstructions) {
  Write-Ok "Workspace AGENTS.md already exists (left unchanged): $workspaceInstructions"
} else {
  Copy-Item -LiteralPath $agentInstructions -Destination $workspaceInstructions
  Write-Ok "Installed $workspaceInstructions"
}

# --- pi CLI ---
Write-Step "pi coding agent CLI"
$piCmd = Get-Command pi -ErrorAction SilentlyContinue
if (-not $piCmd) {
  Write-Host "  Installing @earendil-works/pi-coding-agent globally..."
  npm install -g --ignore-scripts @earendil-works/pi-coding-agent
  $piCmd = Get-Command pi -ErrorAction SilentlyContinue
  if (-not $piCmd) {
    throw "pi still not on PATH after global install. Open a new terminal or check npm prefix."
  }
}
try {
  $piVer = & pi --version 2>&1 | Out-String
  Write-Ok "pi: $($piVer.Trim())"
} catch {
  Write-Ok "pi found at $($piCmd.Source)"
}

# --- MCP adapter package ---
Write-Step "Install pi-mcp-adapter"
try {
  & pi install "npm:pi-mcp-adapter"
  Write-Ok "pi install npm:pi-mcp-adapter finished"
} catch {
  Write-Warn "pi install failed: $_"
  Write-Warn "Try manually: pi install npm:pi-mcp-adapter"
}

# --- Optional user-global MCP mirror (does not overwrite if already has dpa) ---
Write-Step "User-global MCP config (optional mirror)"
$configMcpDir = Join-Path $env:USERPROFILE ".config\mcp"
$configMcp = Join-Path $configMcpDir "mcp.json"
New-Item -ItemType Directory -Force -Path $configMcpDir | Out-Null
$dpaServerBlock = @{
  command = "node"
  args    = @(($DpaMcpServer -replace "\\", "/"))
  lifecycle = "eager"
  idleTimeout = 60
  requestTimeoutMs = 90000
  directTools = $true
  env = @{
    DPA_LAUNCHER_PATH   = ($DpaLauncher -replace "\\", "/")
    DPA_MCP_TIMEOUT_MS  = "90000"
  }
}

if (Test-Path $configMcp) {
  try {
    $existing = Get-Content $configMcp -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $existing.mcpServers) {
      $existing | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    if ($existing.mcpServers.dpa) {
      Write-Ok "User mcp.json already has server 'dpa' (left unchanged): $configMcp"
    } else {
      $existing.mcpServers | Add-Member -NotePropertyName dpa -NotePropertyValue ([pscustomobject]$dpaServerBlock) -Force
      Write-Utf8NoBom $configMcp ($existing | ConvertTo-Json -Depth 12)
      Write-Ok "Added 'dpa' to $configMcp"
    }
  } catch {
    Write-Warn "Could not merge $configMcp : $_"
  }
} else {
  $doc = @{
    settings = @{
      toolPrefix = "none"
      idleTimeout = 30
      requestTimeoutMs = 90000
      directTools = $true
    }
    mcpServers = @{
      dpa = $dpaServerBlock
    }
  }
  Write-Utf8NoBom $configMcp ($doc | ConvertTo-Json -Depth 12)
  Write-Ok "Wrote $configMcp"
}

# --- npm install app ---
if (-not $SkipNpmInstall) {
  Write-Step "npm install (desktop app) — may take several minutes"
  npm install
  Write-Ok "npm install done"
} else {
  Write-Warn "Skipped npm install (-SkipNpmInstall)"
}

Write-Step "Next steps"
Write-Host @"

  1. Ensure model auth for pi (same as terminal pi).
  2. Start DPA (AIAssistantService) so bridge config exists, or use dpa_ensure_running.
  3. Run desktop:
       cd $RepoRoot
       npm run dev
  4. Open workspace: $DpaWorkspace (AGENTS.md + .mcp.json installed by this script).
  5. New session, try:
       先 dpa_ensure_running，再 dpa_get_app_context，总结当前 DPA 状态。

  Docs: docs\DPA-AGENT.md
  Persona: AGENTS.md
  MCP: .mcp.json

"@ -ForegroundColor White

Write-Ok "setup-dpa-agent.ps1 finished"
