$ErrorActionPreference = 'Stop'
$shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'CubeLink Starter Bridge.lnk'
if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
Write-Host 'Windows 로그인 자동 실행을 해제했습니다. 설치 파일은 유지됩니다.'
