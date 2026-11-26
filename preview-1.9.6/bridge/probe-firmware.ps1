param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^COM[1-9][0-9]{0,2}$')]
  [string]$Port
)

$ErrorActionPreference = 'Stop'
$serial = $null
$result = [ordered]@{ present = $false; version = ''; response = '' }

try {
  $serial = [System.IO.Ports.SerialPort]::new($Port, 9600, [System.IO.Ports.Parity]::None, 8, [System.IO.Ports.StopBits]::One)
  $serial.NewLine = "`n"
  $serial.ReadTimeout = 250
  $serial.WriteTimeout = 500
  $serial.DtrEnable = $true
  $serial.Open()
  Start-Sleep -Milliseconds 1800
  $serial.DiscardInBuffer()

  $deadline = [DateTime]::UtcNow.AddSeconds(4)
  while ([DateTime]::UtcNow -lt $deadline -and -not $result.present) {
    $serial.WriteLine('CL:HELLO')
    $listenUntil = [DateTime]::UtcNow.AddMilliseconds(700)
    while ([DateTime]::UtcNow -lt $listenUntil) {
      try {
        $line = $serial.ReadLine().Trim()
        if ($line.StartsWith('CL:LIVE:')) {
          $result.present = $true
          $result.version = $line.Substring(8)
          $result.response = $line
          break
        }
      } catch [System.TimeoutException] {
      }
    }
  }
} catch {
  $result.response = $_.Exception.Message
} finally {
  if ($serial) {
    if ($serial.IsOpen) { $serial.Close() }
    $serial.Dispose()
  }
}

$result | ConvertTo-Json -Compress
