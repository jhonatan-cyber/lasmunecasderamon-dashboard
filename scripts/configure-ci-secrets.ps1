param(
  [string]$Repository = 'jhonatan-cyber/lasmunecasderamon-dashboard'
)
$ErrorActionPreference = 'Stop'
Get-Command gh -ErrorAction Stop | Out-Null
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Primero ejecuta gh auth login.' }
$environmentNames = gh api "repos/$Repository/environments" --jq '.environments[].name'
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron consultar los environments.' }
if ('production' -notin @($environmentNames)) {
  gh api --method PUT "repos/$Repository/environments/production" --silent
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el environment production. Revisa tus permisos.' }
}

function Set-ProductionSecret([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "Falta $Name." }
  # Send the value over stdin, never as a command-line argument.
  $processInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = (Get-Command gh).Source
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardInput = $true
  foreach ($argument in @('secret', 'set', $Name, '--repo', $Repository, '--env', 'production')) {
    $processInfo.ArgumentList.Add($argument)
  }
  $process = [System.Diagnostics.Process]::Start($processInfo)
  try {
    $process.StandardInput.Write($Value)
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw "No se pudo guardar $Name." }
  } finally { $process.Dispose() }
}

foreach ($name in @('SSH_HOST', 'SSH_USERNAME', 'SSH_FINGERPRINT', 'NEXT_PUBLIC_BASE_URL', 'NEXT_PUBLIC_API_URL')) {
  Set-ProductionSecret $name (Read-Host $name)
}
$socketUrl = Read-Host 'NEXT_PUBLIC_SOCKET_URL (Enter si no se utiliza)'
if ($socketUrl) { Set-ProductionSecret 'NEXT_PUBLIC_SOCKET_URL' $socketUrl }
$method = Read-Host 'Autenticación SSH: escribe clave o password'
if ($method -eq 'clave') {
  $keyPath = Read-Host 'Ruta absoluta de la clave privada dedicada al deploy'
  Set-ProductionSecret 'SSH_PRIVATE_KEY' ([System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $keyPath).Path))
} elseif ($method -eq 'password') {
  $securePassword = Read-Host 'Contraseña SSH' -AsSecureString
  $pointer = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    Set-ProductionSecret 'SSH_PASSWORD' ([System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer))
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $securePassword.Dispose()
  }
} else { throw 'Método inválido. Usa clave o password.' }
$sshPort = Read-Host 'Puerto SSH (Enter para 22)'
if (!$sshPort) { $sshPort = '22' }
if ($sshPort -notmatch '^\d+$' -or [int]$sshPort -lt 1 -or [int]$sshPort -gt 65535) { throw 'Puerto inválido.' }
gh variable set SSH_PORT --repo $Repository --body $sshPort
if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar SSH_PORT.' }
gh secret list --repo $Repository --env production
if ($LASTEXITCODE -ne 0) { throw 'No se pudo verificar la lista de secrets.' }
Write-Host 'Secrets configurados. ENABLE_PRODUCTION_DEPLOY no se ha modificado; revisa primero el VPS.'
