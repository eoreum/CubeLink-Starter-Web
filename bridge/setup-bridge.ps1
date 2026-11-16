$ErrorActionPreference = 'Stop'
$bridgeRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolsRoot = Join-Path $bridgeRoot 'tools'
$runtimeRoot = Join-Path $bridgeRoot 'runtime\node'
$downloadRoot = Join-Path ([IO.Path]::GetTempPath()) ('cubelink-starter-bridge-' + [guid]::NewGuid().ToString('N'))
try {
  New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
  New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
  if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot 'node.exe'))) {
    Write-Host '브리지용 Node.js 공식 LTS 휴대용 버전을 준비합니다...'
    $nodeReleases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -Headers @{ 'User-Agent'='CubeLink-Starter-Bridge' }
    $nodeRelease = $nodeReleases | Where-Object { $_.lts -and ($_.files -contains 'win-x64-zip') } | Select-Object -First 1
    if (-not $nodeRelease) { throw 'Windows 64비트 Node.js LTS 버전을 찾지 못했습니다.' }
    $nodeZipName = "node-$($nodeRelease.version)-win-x64.zip"
    $nodeBase = "https://nodejs.org/dist/$($nodeRelease.version)"
    $nodeZip = Join-Path $downloadRoot $nodeZipName
    $nodeChecksums = Join-Path $downloadRoot 'SHASUMS256.txt'
    Invoke-WebRequest -Uri "$nodeBase/$nodeZipName" -OutFile $nodeZip
    Invoke-WebRequest -Uri "$nodeBase/SHASUMS256.txt" -OutFile $nodeChecksums
    $nodeExpectedLine = Get-Content -LiteralPath $nodeChecksums | Where-Object { $_ -match [regex]::Escape($nodeZipName) } | Select-Object -First 1
    if (-not $nodeExpectedLine) { throw 'Node.js 공식 체크섬을 찾지 못했습니다.' }
    $nodeExpectedHash = ($nodeExpectedLine -split '\s+')[0].ToUpperInvariant()
    $nodeActualHash = (Get-FileHash -LiteralPath $nodeZip -Algorithm SHA256).Hash.ToUpperInvariant()
    if ($nodeActualHash -ne $nodeExpectedHash) { throw 'Node.js 다운로드 파일의 SHA-256 검증에 실패했습니다.' }
    $nodeExtract = Join-Path $downloadRoot 'node-extract'
    Expand-Archive -LiteralPath $nodeZip -DestinationPath $nodeExtract -Force
    $nodeFolder = Get-ChildItem -LiteralPath $nodeExtract -Directory | Select-Object -First 1
    if (-not $nodeFolder) { throw 'Node.js 압축 해제에 실패했습니다.' }
    Copy-Item -Path (Join-Path $nodeFolder.FullName '*') -Destination $runtimeRoot -Recurse -Force
  }
  Write-Host 'Arduino CLI 최신 공식 버전을 확인합니다...'
  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/arduino/arduino-cli/releases/latest' -Headers @{ 'User-Agent'='CubeLink-Starter-Bridge' }
  $asset = $release.assets | Where-Object { $_.name -match 'Windows_64bit\.zip$' } | Select-Object -First 1
  if (-not $asset) { throw 'Windows 64비트 Arduino CLI 파일을 찾지 못했습니다.' }
  $checksumAsset = $release.assets | Where-Object { $_.name -match 'checksums\.txt$' } | Select-Object -First 1
  if (-not $checksumAsset) { throw 'Arduino CLI 공식 체크섬 파일을 찾지 못했습니다.' }
  $zip = Join-Path $downloadRoot $asset.name
  $checksumFile = Join-Path $downloadRoot $checksumAsset.name
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
  Invoke-WebRequest -Uri $checksumAsset.browser_download_url -OutFile $checksumFile
  $expectedLine = Get-Content -LiteralPath $checksumFile | Where-Object { $_ -match [regex]::Escape($asset.name) } | Select-Object -First 1
  if (-not $expectedLine) { throw '다운로드 파일의 공식 체크섬을 찾지 못했습니다.' }
  $expectedHash = ($expectedLine -split '\s+')[0].ToUpperInvariant()
  $actualHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedHash) { throw 'Arduino CLI 다운로드 파일의 SHA-256 검증에 실패했습니다.' }
  Expand-Archive -LiteralPath $zip -DestinationPath $toolsRoot -Force
  $cli = Join-Path $toolsRoot 'arduino-cli.exe'
  if (-not (Test-Path -LiteralPath $cli)) { throw 'arduino-cli.exe 압축 해제에 실패했습니다.' }
  Write-Host 'Arduino AVR 보드 지원을 설치합니다...'
  & $cli core update-index
  if ($LASTEXITCODE -ne 0) { throw '보드 목록 갱신에 실패했습니다.' }
  & $cli core install arduino:avr
  if ($LASTEXITCODE -ne 0) { throw 'Arduino AVR 코어 설치에 실패했습니다.' }
  Write-Host 'DHT11 수업용 라이브러리를 설치합니다...'
  & $cli lib install 'DHT sensor library'
  if ($LASTEXITCODE -ne 0) { throw 'DHT sensor library 설치에 실패했습니다.' }
  & $cli lib install 'Adafruit Unified Sensor'
  if ($LASTEXITCODE -ne 0) { throw 'Adafruit Unified Sensor 설치에 실패했습니다.' }
  Write-Host ''
  Write-Host '설치 완료. 이제 start-bridge.cmd를 실행하세요.' -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $downloadRoot) { Remove-Item -LiteralPath $downloadRoot -Recurse -Force }
}
