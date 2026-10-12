$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNode = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $taskNode) { $taskNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Node.js 22.13 or newer is required.' }
$taskJava = Join-Path $taskRoot '.runtime/suwayomi/portable/Suwayomi-Server-v2.4.2366-windows-x64/jre/bin/java.exe'
if (-not (Test-Path -LiteralPath $taskJava)) { & (Join-Path $PSScriptRoot 'setup-suwayomi.ps1') }
Set-Location -LiteralPath $taskRoot
& $taskNode (Join-Path $PSScriptRoot 'start-local.mjs')
