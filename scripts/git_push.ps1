
$remoteUrl = "https://github.com/iredrion-img/kh-rnd-wms"

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git..."
    git init
}

# Add all files
Write-Host "Adding files..."
git add .

# Commit
Write-Host "Committing..."
git commit -m "Initial commit of Kunhwa WMS"

# Rename branch to main
git branch -M main

# Add remote
# Check if remote exists
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "Updating existing remote 'origin'..."
    git remote set-url origin $remoteUrl
}
else {
    Write-Host "Adding remote 'origin'..."
    git remote add origin $remoteUrl
}

# Push
Write-Host "Pushing to GitHub..."
Write-Host "NOTE: If this hangs or fails, you may need to authenticate externally."
git push -u origin main
