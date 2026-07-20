<#
.SYNOPSIS
  Checks that all files using React hooks have 'use client' directive.
  Fails if any file imports hooks from 'react' or '@tanstack/react-query'
  without having 'use client' at the top.

.DESCRIPTION
  Next.js 16 with Turbopack requires every file that uses React hooks
  (useState, useEffect, useRef, useCallback, useMemo, useContext) to have
  'use client' at the top. Files that also use @tanstack/react-query hooks
  (useQuery, useMutation) also need it because those use useRef internally.

  This script scans all .ts and .tsx files and reports violations.

.EXAMPLE
  .\scripts\check-use-client.ps1
#>

$ErrorActionPreference = 'Stop'

# Patterns for React hooks and TanStack Query imports
$hookPattern = '\buse(State|Effect|Ref|Callback|Memo|Context|Reducer|LayoutEffect|ImperativeHandle|DebugValue|InsertionEffect)\b'
$queryHookPattern = '\buse(Mutation|Query)\b'

$errors = @()
$checked = 0
$skipped = 0

# Get all .ts and .tsx files
$files = Get-ChildItem -Recurse -Include '*.ts', '*.tsx' | Where-Object {
    $_.FullName -notmatch 'node_modules|\.next|\.git|tests/e2e|tests/unit|\.agents'
}

foreach ($file in $files) {
    $checked++
    $path = $file.FullName
    $lines = @(Get-Content $path -ErrorAction SilentlyContinue)
    if ($lines.Count -eq 0) { $skipped++; continue }

    # Normalize line endings
    $lines = $lines | ForEach-Object { $_.TrimEnd("`r") }

    $l0 = $lines[0]

    # Check: already has 'use client' on line 1
    if ($l0 -match "^'use client'|^`"use client`"") { continue }

    # Check: line 1 blank, line 2 has 'use client'
    if ($lines.Count -gt 1 -and [string]::IsNullOrWhiteSpace($l0) -and $lines[1] -match "^'use client'|^`"use client`"") { continue }

    # Check: line 1 is ESLint comment, line 2 has 'use client'
    if ($l0 -match '^/\*' -and $lines.Count -gt 1 -and $lines[1] -match "^'use client'|^`"use client`"") { continue }

    # Build full content for deeper check
    $content = [System.String]::Join("`n", $lines)

    # Does the file import from 'react' or '@tanstack/react-query'?
    $importsReact = $content -match "from ['""]react['""]"
    $importsQuery = $content -match "from ['""]@tanstack/react-query['""]"
    if (-not $importsReact -and -not $importsQuery) { continue }

    # Does the file import and use actual hooks?
    $importsHooks = $content -match "${hookPattern}\s*[,}]"
    $importsQueryHooks = $content -match "${queryHookPattern}\s*[,}]"
    if (-not $importsHooks -and -not $importsQueryHooks) { continue }

    # We have a violation
    $relPath = Resolve-Path -Path $path -Relative
    $errors += $relPath
}

if ($errors.Count -gt 0) {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "  ERROR: Archivos sin 'use client'" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Los siguientes archivos usan React hooks" -ForegroundColor Yellow
    Write-Host "pero NO tienen 'use client' en la primera línea:" -ForegroundColor Yellow
    Write-Host "`n"
    foreach ($err in $errors) {
        Write-Host "  ❌ $err" -ForegroundColor Red
    }
    Write-Host "`nAgregá 'use client' al inicio de cada archivo." -ForegroundColor Yellow
    Write-Host "Revisados: $checked | Omitidos: $skipped | Errores: $($errors.Count)`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Todos los archivos revisados tienen 'use client'" -ForegroundColor Green
    Write-Host "   Revisados: $checked | Omitidos (vacíos): $skipped`n" -ForegroundColor Green
    exit 0
}
