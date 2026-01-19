
Add-Type -AssemblyName System.Drawing

$destPng = "c:\KH_RnD\public\favicon.png"
$size = 512
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#009540")
$textColor = [System.Drawing.Color]::White
$text = "KH"

# Create bitmap
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)

# Fill background
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$g.FillRectangle($brush, 0, 0, $size, $size)
$brush.Dispose()

# Configure text
$fontFamily = New-Object System.Drawing.FontFamily("Arial")
$fontStyle = [System.Drawing.FontStyle]::Bold
$fontSize = 200 # Initial guess, will adjust or use fixed
$font = New-Object System.Drawing.Font($fontFamily, $fontSize, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush($textColor)

# Measure and center text (simple centering)
$textSize = $g.MeasureString($text, $font)
$x = ($size - $textSize.Width) / 2
$y = ($size - $textSize.Height) / 2

# Draw text
$g.DrawString($text, $font, $textBrush, $x, $y)

# Cleanup
$textBrush.Dispose()
$font.Dispose()
$g.Dispose()

# Save
$bmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Favicon generated at $destPng"
