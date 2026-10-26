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

  # Solo los .ts/.tsx del índice (lo que usa el pre-commit)
  .\scripts\check-use-client.ps1 -Staged
#>

param(
    # Revisar solo los archivos staged en vez de recorrer el árbol completo.
    # El pre-commit lo usa para no pagar el escaneo de ~1685 archivos.
    [switch]$Staged
)

$ErrorActionPreference = 'Stop'

# La salida también termina en hooks y logs redirigidos: fijar UTF-8 evita que
# PowerShell vuelque 'índice' o ✅ con la code page OEM de la consola.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$alcance = if ($Staged) { 'del índice' } else { 'del árbol' }

# Patterns for React hooks and TanStack Query imports
$hookPattern = '\buse(State|Effect|Ref|Callback|Memo|Context|Reducer|LayoutEffect|ImperativeHandle|DebugValue|InsertionEffect)\b'
$queryHookPattern = '\buse(Mutation|Query)\b'

$errors = @()
$checked = 0
$skipped = 0

# Con -Staged se revisa solo el índice: los .ts/.tsx que van en este commit.
# Sin el flag se recorre el árbol completo (CI, antes de cerrar una rama).
if ($Staged) {
    $raiz = (git rev-parse --show-toplevel).Trim() -replace '\\', '/'
    $relativos = @(git -C $raiz diff --cached --name-only --diff-filter=ACMR -- '*.ts' '*.tsx')
    $files = @(
        foreach ($relativo in $relativos) {
            $relativo = $relativo.Trim()
            if ([string]::IsNullOrWhiteSpace($relativo)) { continue }
            if (($relativo -replace '\\', '/') -match 'node_modules|\.next|\.git|tests/e2e|tests/unit|\.agents') { continue }
            $completo = Join-Path $raiz $relativo
            if (Test-Path -LiteralPath $completo) { Get-Item -LiteralPath $completo }
        }
    )
} else {
    $files = Get-ChildItem -Recurse -Include '*.ts', '*.tsx' | Where-Object {
        $_.FullName -notmatch 'node_modules|\.next|\.git|tests[\\/]e2e|tests[\\/]unit|\.agents'
    }
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
    Write-Host "Revisados $alcance`: $checked | Omitidos: $skipped | Errores: $($errors.Count)`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Todos los archivos revisados tienen 'use client'" -ForegroundColor Green
    Write-Host "   Revisados $alcance`: $checked | Omitidos (vacíos): $skipped`n" -ForegroundColor Green
    exit 0
}
