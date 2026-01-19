
Add-Type -AssemblyName System.Drawing
$source = "c:\KH_RnD\public\kh_logo.png"
$dest = "c:\KH_RnD\public\kh_logo.ico"

Write-Host "Starting Icon Conversion..."
try {
    # Verify source exists
    if (-not (Test-Path $source)) {
        throw "Source image not found at $source"
    }

    $img = [System.Drawing.Bitmap]::FromFile($source)
    $handle = $img.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($handle)
    $fs = New-Object System.IO.FileStream($dest, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()
    $img.Dispose()
    Write-Host "Icon created successfully at $dest"
} catch {
    Write-Error "Failed to create icon: $_"
    exit 1
}

Write-Host "Creating Server Shortcut..."
try {
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("c:\KH_RnD\Start_Server.lnk")
    $Shortcut.TargetPath = "c:\KH_RnD\Run_All.bat"
    $Shortcut.IconLocation = $dest
    $Shortcut.Description = "Start Kunhwa WMS Server & Tunnel"
    $Shortcut.WorkingDirectory = "c:\KH_RnD"
    $Shortcut.Save()
    Write-Host "Server shortcut created successfully."
} catch {
    Write-Error "Failed to create shortcut: $_"
}
