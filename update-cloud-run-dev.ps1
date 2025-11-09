# Update Cloud Run with Development Settings
# This will allow all origins and enable password bypass for testing

Write-Host "🔧 Updating Cloud Run to Development Mode..." -ForegroundColor Cyan
Write-Host ""

# Update Cloud Run with development environment variables
gcloud run services update organizations `
  --region=europe-west1 `
  --update-env-vars "NODE_ENV=development,ALLOW_DEV_BYPASS=true" `
  --remove-env-vars ALLOWED_ORIGINS `
  --project=earnest-radio-475808-j8

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Cloud Run updated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Changes applied:" -ForegroundColor Cyan
    Write-Host "  - NODE_ENV=development (allows all CORS origins)" -ForegroundColor Green
    Write-Host "  - ALLOW_DEV_BYPASS=true (enables test passwords)" -ForegroundColor Green
    Write-Host "  - ALLOWED_ORIGINS removed (no whitelist)" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ Wait 1-2 minutes for deployment to complete" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🧪 Test Login with:" -ForegroundColor Cyan
    Write-Host "  Email: sanulalakvin545@gmail.com" -ForegroundColor White
    Write-Host "  Password: Password123@ (or one of the bypass passwords)" -ForegroundColor White
    Write-Host ""
    Write-Host "Bypass passwords that will work:" -ForegroundColor Yellow
    Write-Host "  - Password123@" -ForegroundColor White
    Write-Host "  - laas123" -ForegroundColor White
    Write-Host "  - admin123" -ForegroundColor White
    Write-Host "  - temp123" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Failed to update Cloud Run" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try: gcloud auth login" -ForegroundColor Yellow
}
