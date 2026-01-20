
$deployDir = "C:\KH_RnD\Deployment_Package"
$zipFile = "C:\KH_RnD\Kunhwa_WMS_Deploy.zip"

# Clean up previous attempts
if (Test-Path $deployDir) { Remove-Item -Recurse -Force $deployDir }
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }

# Create dir
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# Copy Files
Copy-Item "C:\KH_RnD\Setup.bat" -Destination $deployDir
Copy-Item "C:\KH_RnD\Run_All.bat" -Destination $deployDir
Copy-Item "C:\KH_RnD\Run_WMS.bat" -Destination $deployDir
Copy-Item "C:\KH_RnD\server.js" -Destination $deployDir
Copy-Item "C:\KH_RnD\package.json" -Destination $deployDir
Get-ChildItem "C:\KH_RnD\database_*.csv" | Copy-Item -Destination $deployDir
if (Test-Path "C:\KH_RnD\users.csv") { Copy-Item "C:\KH_RnD\users.csv" -Destination $deployDir }

# Copy Directories
Copy-Item "C:\KH_RnD\dist" -Destination $deployDir -Recurse
Copy-Item "C:\KH_RnD\public" -Destination $deployDir -Recurse

# Zip it
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($deployDir, $zipFile)

# Cleanup dir
Remove-Item -Recurse -Force $deployDir

Write-Host "Deployment package created at: $zipFile"
