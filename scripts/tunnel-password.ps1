#Requires -Version 5.1
<# 
  Печатает текущий tunnel password для localtunnel:
  - адрес из docker-localtunnel (loca.lt) зависит от публичного IP сети.
  - пароль меняется, если меняется публичный IP (VPN/мобильный/роутер).
#>
$ErrorActionPreference = 'Stop'
$pwd = (Invoke-WebRequest -UseBasicParsing -Uri 'https://loca.lt/mytunnelpassword' -Method Get).Content.Trim()
Write-Output $pwd

