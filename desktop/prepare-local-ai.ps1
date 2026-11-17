$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$zip=Join-Path $root 'llama-runtime.zip'
Invoke-WebRequest -Uri 'https://github.com/ggml-org/llama.cpp/releases/download/b12465/llama-b12465-bin-win-cpu-x64.zip' -OutFile $zip
if((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne 'D0F60F97221375779AE590DA874E8E8BDE7FD5F0B973B2E82FC9237AF8253446'){throw 'llama.cpp checksum mismatch'}
Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'local-runtime') -Force
if(-not (Test-Path -LiteralPath (Join-Path $root 'local-runtime/llama-server.exe'))){throw 'Local AI runtime missing'}
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/ggml-org/llama.cpp/b12465/LICENSE' -OutFile (Join-Path $root 'LICENSES/llama.cpp-MIT.txt')
Invoke-WebRequest -Uri 'https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/23749fefcc72300e3a2ad315e1317431b06b590a/LICENSE' -OutFile (Join-Path $root 'LICENSES/Qwen-Apache2.txt')
