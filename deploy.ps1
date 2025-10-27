# PowerShell script to commit and push backend changes to GitHub
# Run this from the backend directory: .\deploy.ps1

Write-Host "Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "Adding changes to git..." -ForegroundColor Cyan
git add package.json

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m "Move TypeScript types to dependencies for Render build"

Write-Host "Setting remote URL with token..." -ForegroundColor Cyan
git remote set-url origin https://roel-sundiam:$env:GITHUB_TOKEN@github.com/roel-sundiam/bracket-ace-backend.git

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "Cleaning up token from git config..." -ForegroundColor Cyan
git remote set-url origin https://github.com/roel-sundiam/bracket-ace-backend.git

Write-Host "Done! Your changes have been pushed to GitHub." -ForegroundColor Green
Write-Host "Render will automatically rebuild your backend." -ForegroundColor Green
