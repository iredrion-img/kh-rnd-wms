
Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\KH_RnD\public\logo_source.png"
$destIco = "c:\KH_RnD\public\favicon.ico"
$destPng = "c:\KH_RnD\public\favicon.png"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source file not found: $sourcePath"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

# 1. Save as PNG (Resize to standard favicon size 192x192 for high DPI)
$pngSize = 192
$pngBmp = New-Object System.Drawing.Bitmap($pngSize, $pngSize)
$g = [System.Drawing.Graphics]::FromImage($pngBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($bmp, 0, 0, $pngSize, $pngSize)
$g.Dispose()
$pngBmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBmp.Dispose()
Write-Host "Generated $destPng"

# 2. Save as ICO (Standard 64x64 or smaller is common for ico, but let's do 64x64)
$icoSize = 64
$icoBmp = New-Object System.Drawing.Bitmap($icoSize, $icoSize)
$gIco = [System.Drawing.Graphics]::FromImage($icoBmp)
$gIco.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIco.DrawImage($bmp, 0, 0, $icoSize, $icoSize)
$gIco.Dispose()

# Save ICO
$handle = $icoBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($handle)
$fs = New-Object System.IO.FileStream($destIco, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icoBmp.Dispose()
$bmp.Dispose()

Write-Host "Generated $destIco"
