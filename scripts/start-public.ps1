# Chạy LB HOUSE cho người ở xa truy cập qua Cloudflare Quick Tunnel (không cần tên miền).
# Dùng:  powershell -ExecutionPolicy Bypass -File scripts\start-public.ps1
# Thêm -SkipBuild nếu đã build rồi và chỉ muốn bật lại.
param([switch]$SkipBuild)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$cf = @('C:\Program Files (x86)\cloudflared\cloudflared.exe', 'C:\Program Files\cloudflared\cloudflared.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $cf) { $c = Get-Command cloudflared -ErrorAction SilentlyContinue; if ($c) { $cf = $c.Source } }
if (-not $cf) { throw 'Chua cai cloudflared. Chay: winget install --id Cloudflare.cloudflared -e' }

if (-not $SkipBuild) {
  # same-origin: web gọi API/socket cùng địa chỉ với trang, nên địa chỉ tunnel đổi cũng không phải build lại
  $env:NEXT_PUBLIC_API_URL = 'same-origin'
  $env:NEXT_PUBLIC_SOCKET_URL = 'same-origin'
  npm run build
}

$procs = @()
$procs += Start-Process node -ArgumentList 'apps/server/dist/index.js' -PassThru -WindowStyle Hidden -WorkingDirectory $root
$procs += Start-Process cmd -ArgumentList '/c', 'npm -w apps/web run start' -PassThru -WindowStyle Hidden -WorkingDirectory $root
$procs += Start-Process node -ArgumentList 'scripts/gateway.js' -PassThru -WindowStyle Hidden -WorkingDirectory $root
$py = Get-Command python -ErrorAction SilentlyContinue
if ($py) {
  $procs += Start-Process $py.Source -ArgumentList 'scripts/detector_service.py' -PassThru -WindowStyle Hidden -WorkingDirectory $root
} else {
  Write-Host 'CANH BAO: khong tim thay python, quet the bang anh se khong hoat dong (cai Python va pip install opencv-contrib-python numpy).'
}
Write-Host 'Dang khoi dong server, web, detector, cong gop (8080)...'
Start-Sleep -Seconds 8
Write-Host 'Truy cap tren may nay: http://localhost:8080'
Write-Host 'Tim dong https://....trycloudflare.com ben duoi, do la dia chi cho may khac. Nhan Ctrl+C de tat tat ca.'
try { & $cf tunnel --url http://localhost:8080 }
finally {
  foreach ($p in $procs) { try { taskkill /PID $p.Id /T /F | Out-Null } catch {} }
}
