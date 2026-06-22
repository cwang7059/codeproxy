param(
  [switch]$Rebuild,
  [string]$BackendBase = "",
  [switch]$NoPrompt,
  [switch]$OpenAnyway,
  [switch]$SkipCliRelayStart
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$launcher = Join-Path $rootDir "scripts\start-electron-admin.ps1"
$savedBackendFile = Join-Path $rootDir ".code-proxy-admin.local"
$defaultBackendBase = "http://67.215.253.110:8317"
$workspaceRoot = Split-Path -Parent $rootDir
$cliRelayRoot = Join-Path $workspaceRoot "CliRelay"
$cliRelayLauncher = Join-Path $cliRelayRoot "start-clirelay.ps1"

function Write-Step {
  param([string]$Message)
  Write-Host "[Code Proxy Admin] $Message"
}

function Normalize-BackendBase {
  param([string]$Value)

  $base = ([string]$Value).Trim()
  if (!$base) {
    return ""
  }

  $base = $base -replace "/?v0/management/?$", ""
  $base = $base.TrimEnd([char[]]"/")

  if ($base -notmatch "^https?://") {
    $base = "http://$base"
  }

  return $base
}

function Test-BackendPort {
  param([string]$BaseUrl)

  if (!$BaseUrl) {
    return $false
  }

  try {
    $uri = [Uri]$BaseUrl
    $port = $uri.Port
    if ($port -le 0) {
      $port = if ($uri.Scheme -eq "https") { 443 } else { 80 }
    }

    $client = New-Object System.Net.Sockets.TcpClient
    try {
      $async = $client.BeginConnect($uri.Host, $port, $null, $null)
      if (!$async.AsyncWaitHandle.WaitOne(800, $false)) {
        return $false
      }

      $client.EndConnect($async)
      return $true
    } finally {
      $client.Close()
    }
  } catch {
    return $false
  }
}

function Read-SavedBackendBase {
  if (!(Test-Path -LiteralPath $savedBackendFile)) {
    return ""
  }

  try {
    return Normalize-BackendBase (Get-Content -LiteralPath $savedBackendFile -Raw)
  } catch {
    return ""
  }
}

function Save-BackendBase {
  param([string]$BaseUrl)

  try {
    Set-Content -LiteralPath $savedBackendFile -Value $BaseUrl -Encoding ASCII
  } catch {
    Write-Step "Could not save backend address: $($_.Exception.Message)"
  }
}

function Wait-BackendPort {
  param(
    [string]$BaseUrl,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-BackendPort $BaseUrl) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-CliRelayIfAvailable {
  param([string]$BaseUrl)

  if ($SkipCliRelayStart) {
    return
  }

  if (Test-BackendPort $BaseUrl) {
    return
  }

  if (!(Test-Path -LiteralPath $cliRelayLauncher)) {
    Write-Step "CliRelay launcher was not found at $cliRelayLauncher."
    return
  }

  Write-Step "Starting CliRelay backend..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $cliRelayLauncher
  if ($LASTEXITCODE -ne 0) {
    throw "CliRelay failed to start. Check $cliRelayLauncher output."
  }

  if (Wait-BackendPort $BaseUrl 25) {
    Write-Step "CliRelay backend is ready: $BaseUrl"
    return
  }

  Write-Step "CliRelay start command finished, but $BaseUrl is still not reachable."
}

function Resolve-BackendBase {
  $explicit = Normalize-BackendBase $BackendBase
  if ($explicit) {
    return $explicit
  }

  $envBase = Normalize-BackendBase $env:CODE_PROXY_API_BASE
  if ($envBase) {
    return $envBase
  }

  $savedBase = Read-SavedBackendBase
  if ($savedBase -and (Test-BackendPort $savedBase)) {
    Write-Step "Using saved backend: $savedBase"
    return $savedBase
  }
  if ($savedBase -and $NoPrompt) {
    Write-Step "Using saved backend: $savedBase"
    return $savedBase
  }

  $candidates = @(
    $defaultBackendBase,
    "http://localhost:8317"
  )

  foreach ($candidate in $candidates) {
    if (Test-BackendPort $candidate) {
      Write-Step "Detected backend: $candidate"
      return $candidate
    }
  }

  if ($NoPrompt) {
    Write-Step "No running CliRelay backend was detected. Using $defaultBackendBase."
    return $defaultBackendBase
  }

  Write-Host ""
  Write-Step "No running CliRelay backend was detected on 127.0.0.1:8317."
  Write-Host "Enter the CliRelay backend URL, for example: http://127.0.0.1:8317"
  $typedBase = Read-Host "Backend URL (press Enter to use $defaultBackendBase)"

  $resolved = Normalize-BackendBase $typedBase
  if (!$resolved) {
    $resolved = $defaultBackendBase
  }

  return $resolved
}

if (!(Test-Path -LiteralPath $launcher)) {
  throw "Launcher was not found: $launcher"
}

Set-Location -LiteralPath $rootDir

$resolvedBackendBase = Resolve-BackendBase
Save-BackendBase $resolvedBackendBase
Start-CliRelayIfAvailable $resolvedBackendBase

if (!(Test-BackendPort $resolvedBackendBase)) {
  Write-Host ""
  Write-Step "Backend is not reachable at $resolvedBackendBase."
  Write-Host "Start CliRelay first, otherwise the desktop UI will show backend connection errors."
  if (!$OpenAnyway -and $NoPrompt) {
    exit 1
  }

  if (!$OpenAnyway) {
    $openAnywayAnswer = Read-Host "Open the desktop UI anyway? (y/N)"
  }

  if (!$OpenAnyway -and $openAnywayAnswer -notmatch "^(y|yes)$") {
    exit 1
  }
}

if ($Rebuild) {
  & $launcher -Rebuild -BackendBase $resolvedBackendBase
} else {
  & $launcher -BackendBase $resolvedBackendBase
}
exit $LASTEXITCODE
