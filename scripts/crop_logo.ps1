
Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\KH_RnD\public\kh_logo.png"
$destPng = "c:\KH_RnD\public\kh_logo.png"
$destIco = "c:\KH_RnD\public\kh_logo.ico"

Write-Host "Processing logo..."

if (-not (Test-Path $sourcePath)) {
    Write-Error "File not found: $sourcePath"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
$width = $bmp.Width
$height = $bmp.Height

# Find bounding box
$minX = $width
$minY = $height
$maxX = 0
$maxY = 0
$found = $false

for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
        $pixel = $bmp.GetPixel($x, $y)
        # Check if not white (allowing slight verification). Alpha check too.
        if ($pixel.A -gt 0 -and ($pixel.R -lt 250 -or $pixel.G -lt 250 -or $pixel.B -lt 250)) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            $found = $true
        }
    }
}

if (-not $found) {
    Write-Warning "No content found (image is all white?). Using original."
    $bmp.Dispose()
    exit
}

# Add small padding
$padding = 10
$minX = [Math]::Max(0, $minX - $padding)
$minY = [Math]::Max(0, $minY - $padding)
$maxX = [Math]::Min($width - 1, $maxX + $padding)
$maxY = [Math]::Min($height - 1, $maxY + $padding)

$cropWidth = $maxX - $minX + 1
$cropHeight = $maxY - $minY + 1
$size = [Math]::Max($cropWidth, $cropHeight)

# Create square canvas
$squareBmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.Clear([System.Drawing.Color]::Transparent) # or White

# Center the cropped content
$destX = ($size - $cropWidth) / 2
$destY = ($size - $cropHeight) / 2

$cropRect = New-Object System.Drawing.Rectangle($minX, $minY, $cropWidth, $cropHeight)
$destRect = New-Object System.Drawing.Rectangle($destX, $destY, $cropWidth, $cropHeight)

$g.DrawImage($bmp, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

$bmp.Dispose()
$g.Dispose()

# Save PNG
$squareBmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)

# Save ICO
$handle = $squareBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($handle)
$fs = New-Object System.IO.FileStream($destIco, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$squareBmp.Dispose()

Write-Host "Logo cropped and saved successfully."
