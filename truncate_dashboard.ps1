$content = Get-Content 'C:\KH_WMS\kh-rnd-wms\src\pages\Dashboard.jsx' -Encoding UTF8
$truncated = $content[0..945]
[System.IO.File]::WriteAllLines('C:\KH_WMS\kh-rnd-wms\src\pages\Dashboard.jsx', $truncated, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Lines: $($truncated.Count)"
