$ErrorActionPreference = 'Stop'
$bridgeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = Join-Path $bridgeRoot 'runtime\node\node.exe'
if (-not (Test-Path -LiteralPath $node)) {
  $installedRoot = Join-Path $env:LOCALAPPDATA 'CubeLinkStarter\Bridge'
  if ([IO.Path]::GetFullPath($bridgeRoot) -ne [IO.Path]::GetFullPath($installedRoot) -and (Test-Path -LiteralPath (Join-Path $installedRoot 'runtime\node\node.exe'))) {
    & (Join-Path $installedRoot 'start-bridge.ps1')
    exit
  }
  throw 'setup-bridge.cmd를 먼저 실행하세요.'
}
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:32145/health' -Headers @{ Origin='https://eoreum.github.io' } -TimeoutSec 3
  if ($health.ok -and $health.bridgeVersion -eq '1.2.0') { exit 0 }
} catch { }
$logs = Join-Path $bridgeRoot 'logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $bridgeRoot 'server.mjs') + '"') -WorkingDirectory $bridgeRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'bridge.log') -RedirectStandardError (Join-Path $logs 'bridge-error.log')
for ($attempt=0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:32145/health' -Headers @{ Origin='https://eoreum.github.io' } -TimeoutSec 2
    if ($health.ok) { exit 0 }
  } catch { }
}
throw '최신 브리지를 확인하지 못했습니다. 이전 브리지가 포트 32145를 사용 중인지 확인하고 logs 폴더를 확인하세요.'
