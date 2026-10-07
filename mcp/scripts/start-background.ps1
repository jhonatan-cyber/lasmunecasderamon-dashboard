$ErrorActionPreference = 'Stop'
$taskWorkspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
try {
    $taskHealth = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/.well-known/oauth-authorization-server' -UseBasicParsing -TimeoutSec 3
    if (($taskHealth.Content | ConvertFrom-Json).issuer -eq 'http://127.0.0.1:3001/') { return }
} catch { }
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskScript = Join-Path $PSScriptRoot 'start-local.mjs'
$taskLogs = Join-Path $taskWorkspace 'mcp/.data'
New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
Start-Process -FilePath $taskNode -ArgumentList @('"' + $taskScript + '"') -WorkingDirectory $taskWorkspace -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'server.stdout.log') -RedirectStandardError (Join-Path $taskLogs 'server.stderr.log') | Out-Null
