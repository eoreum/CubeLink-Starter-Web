$ErrorActionPreference='Stop'
$desktopRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot=Split-Path -Parent $desktopRoot
$payloadRoot=Join-Path $desktopRoot 'payload'
New-Item -ItemType Directory -Path $payloadRoot,(Join-Path $desktopRoot 'ui'),(Join-Path $desktopRoot 'LICENSES') -Force | Out-Null
Get-ChildItem -LiteralPath $repositoryRoot -File | Where-Object {$_.Extension -in @('.js','.css','.html')} | Copy-Item -Destination (Join-Path $desktopRoot 'ui') -Force
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'vendor') -Destination (Join-Path $desktopRoot 'ui') -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $desktopRoot 'bridge') -Force | Out-Null
foreach($name in @('server.mjs','probe-firmware.ps1','firmware','README.md')){Copy-Item -LiteralPath (Join-Path $repositoryRoot "bridge/$name") -Destination (Join-Path $desktopRoot 'bridge') -Recurse -Force}
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'THIRD_PARTY_NOTICES.md'),(Join-Path $repositoryRoot 'vendor/LICENSE') -Destination (Join-Path $desktopRoot 'LICENSES') -Force
$release=Invoke-RestMethod -Uri 'https://api.github.com/repos/arduino/arduino-cli/releases/latest' -Headers @{'User-Agent'='CubeLink-Starter-Desktop'}
$asset=$release.assets | Where-Object {$_.name -match 'Windows_64bit.zip$'} | Select-Object -First 1
$checksums=$release.assets | Where-Object {$_.name -match 'checksums.txt$'} | Select-Object -First 1
if(-not $asset -or -not $checksums){throw 'Arduino download assets missing'}
$zipPath=Join-Path $desktopRoot 'arduino-cli.zip'
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
$hashText=(Invoke-WebRequest -Uri $checksums.browser_download_url).Content
$expected=(($hashText -split "`n" | Where-Object {$_ -match ([regex]::Escape($asset.name)+'$')}) -split '\s+')[0]
if((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash -ne $expected){throw 'Arduino checksum mismatch'}
Expand-Archive -LiteralPath $zipPath -DestinationPath $payloadRoot -Force
Copy-Item -LiteralPath (Join-Path $payloadRoot 'LICENSE.txt') -Destination (Join-Path $desktopRoot 'LICENSES/Arduino-CLI-GPL3.txt') -Force
$env:ARDUINO_DIRECTORIES_DATA=Join-Path $payloadRoot 'data'
$env:ARDUINO_DIRECTORIES_USER=Join-Path $payloadRoot 'user'
$env:ARDUINO_DIRECTORIES_DOWNLOADS=Join-Path $desktopRoot 'downloads-cache'
$cli=Join-Path $payloadRoot 'arduino-cli.exe'
& $cli core update-index
if($LASTEXITCODE){throw 'Index failed'}
& $cli core install arduino:avr
if($LASTEXITCODE){throw 'AVR core failed'}
& $cli lib install 'DHT sensor library' 'Adafruit Unified Sensor'
if($LASTEXITCODE){throw 'Libraries failed'}
# Do not distribute a machine-specific installation identity.
$inventory=Join-Path $payloadRoot 'data/inventory.yaml'
if(Test-Path -LiteralPath $inventory){Remove-Item -LiteralPath $inventory -Force}
& node (Join-Path $desktopRoot 'prepare-ui.cjs')
if($LASTEXITCODE){throw 'UI preparation failed'}
