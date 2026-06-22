param(
  [switch]$Rebuild,
  [string]$BackendBase = "http://67.215.253.110:8317"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$appExe = Join-Path $rootDir "release\electron\win-unpacked\Code Proxy Admin.exe"

function Write-Step {
  param([string]$Message)
  Write-Host "[Code Proxy Admin] $Message"
}

function Get-JavaScriptToolchain {
  $pathBun = Get-Command bun -ErrorAction SilentlyContinue
  if ($pathBun) {
    return [pscustomobject]@{
      Name = "bun"
      Executable = $pathBun.Source
      InstallArguments = @("install")
      BuildArguments = @("run", "electron:pack")
    }
  }

  $userBun = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
  if (Test-Path -LiteralPath $userBun) {
    return [pscustomobject]@{
      Name = "bun"
      Executable = $userBun
      InstallArguments = @("install")
      BuildArguments = @("run", "electron:pack")
    }
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    return [pscustomobject]@{
      Name = "npm"
      Executable = $npm.Source
      InstallArguments = @("install")
      BuildArguments = @("run", "electron:pack")
    }
  }

  throw "Neither Bun nor npm was found. Install Bun (recommended) or Node.js/npm, then run this script again."
}

function Get-LatestSourceWriteTime {
  $sourcePaths = @(
    "electron",
    "src",
    "scripts\electron-preview.mjs",
    "scripts\electron-dev.mjs",
    "index.html",
    "manage.html",
    "package.json",
    "bun.lock",
    "tsconfig.json",
    "vite.config.ts"
  )

  $latest = Get-Date "1970-01-01"
  foreach ($relativePath in $sourcePaths) {
    $path = Join-Path $rootDir $relativePath
    if (!(Test-Path -LiteralPath $path)) {
      continue
    }

    $items = Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue
    if (!$items) {
      $items = @(Get-Item -LiteralPath $path)
    }

    foreach ($item in $items) {
      if ($item.LastWriteTime -gt $latest) {
        $latest = $item.LastWriteTime
      }
    }
  }

  return $latest
}

function Test-ShouldBuild {
  if ($Rebuild) {
    return $true
  }

  if (!(Test-Path -LiteralPath $appExe)) {
    return $true
  }

  $appWriteTime = (Get-Item -LiteralPath $appExe).LastWriteTime
  return (Get-LatestSourceWriteTime) -gt $appWriteTime
}

function Test-BackendPort {
  param([string]$BaseUrl)

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

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

Set-Location -LiteralPath $rootDir
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

if ($BackendBase.Trim()) {
  $env:CODE_PROXY_API_BASE = $BackendBase.Trim()
  if (Test-BackendPort $env:CODE_PROXY_API_BASE) {
    Write-Step "Backend detected: $env:CODE_PROXY_API_BASE"
  } else {
    Write-Step "Backend is not reachable at $env:CODE_PROXY_API_BASE. The desktop UI will still open; start CliRelay if API calls fail."
  }
}

if (Test-ShouldBuild) {
  $toolchain = Get-JavaScriptToolchain
  Write-Step "Using JavaScript toolchain: $($toolchain.Name)"

  if (!(Test-Path -LiteralPath (Join-Path $rootDir "node_modules"))) {
    Write-Step "Installing dependencies..."
    Invoke-Checked -FilePath $toolchain.Executable -Arguments $toolchain.InstallArguments
  }

  Write-Step "Building desktop package..."
  Invoke-Checked -FilePath $toolchain.Executable -Arguments $toolchain.BuildArguments
}

if (!(Test-Path -LiteralPath $appExe)) {
  throw "Desktop executable was not found: $appExe"
}

Write-Step "Starting desktop app..."
Start-Process -FilePath $appExe -WorkingDirectory (Split-Path -Parent $appExe)
