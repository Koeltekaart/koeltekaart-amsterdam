# build-zip.ps1
# Packages the frontend folder into koeltekaart-amsterdam.zip
# ready for delivery to the Amsterdam webteam.
#
# Usage:  .\build-zip.ps1
# Output: koeltekaart-amsterdam.zip  (in the project root)

$root     = Split-Path -Parent $MyInvocation.MyCommand.Path
$src      = Join-Path $root "frontend"
$out      = Join-Path $root "koeltekaart-amsterdam.zip"

if (Test-Path $out) { Remove-Item $out -Force }

Compress-Archive -Path "$src\*" -DestinationPath $out -CompressionLevel Optimal

$size = [math]::Round((Get-Item $out).Length / 1MB, 2)
Write-Host "✅  Built: $out  ($size MB)" -ForegroundColor Green
