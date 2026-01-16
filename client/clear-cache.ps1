# Clear React/ESLint cache and restart

Write-Host "Clearing React build cache..." -ForegroundColor Yellow

# Remove build folder
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✓ Removed build folder" -ForegroundColor Green
}

# Remove node_modules/.cache
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✓ Removed node_modules/.cache" -ForegroundColor Green
}

# Remove .eslintcache
if (Test-Path ".eslintcache") {
    Remove-Item -Force ".eslintcache"
    Write-Host "✓ Removed .eslintcache" -ForegroundColor Green
}

Write-Host "`nCache cleared successfully!" -ForegroundColor Green
Write-Host "`nNow run: npm start" -ForegroundColor Cyan
