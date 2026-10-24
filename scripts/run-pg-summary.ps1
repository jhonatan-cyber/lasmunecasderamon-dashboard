$ErrorActionPreference = 'SilentlyContinue'
$tmp = Join-Path $env:TEMP "vitest-pg-summary-$([guid]::NewGuid().ToString('N')).log"
npx vitest run --config vitest.postgres.config.ts *> $tmp
$lines = (Get-Content -Path $tmp -ErrorAction SilentlyContinue | Where-Object { $_ -match '\S' })
Write-Host '=== STDOUT_LAST 120 NON-EMPTY LINES ==='
if ($lines) {
  $lines[-120..-1] | ForEach-Object { Write-Host $_ }
} else {
  Write-Host '(no output)'
}
Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
exit 0
