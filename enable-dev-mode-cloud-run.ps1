# Update Cloud Run for Development Mode - Allow All Origins
# This removes NODE_ENV=production and ALLOWED_ORIGINS restrictions

Write-Host "🔧 Updating Cloud Run to Development Mode (Allow All Origins)..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will allow ALL origins to access your API" -ForegroundColor Yellow
Write-Host "    Only use this for development/testing!" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue? (yes/no)"
if ($continue -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Removing NODE_ENV and ALLOWED_ORIGINS from Cloud Run..." -ForegroundColor Cyan

# Remove NODE_ENV and ALLOWED_ORIGINS to trigger development mode
gcloud run services update organizations `
  --region=europe-west1 `
  --remove-env-vars NODE_ENV,ALLOWED_ORIGINS `
  --project=earnest-radio-475808-j8

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Cloud Run updated to development mode." -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Changes Applied:" -ForegroundColor Cyan
    Write-Host "  - NODE_ENV: removed (defaults to development)" -ForegroundColor Green
    Write-Host "  - ALLOWED_ORIGINS: removed (allows all origins)" -ForegroundColor Green
    Write-Host "  - CORS: Now allows requests from ANY origin" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ Wait 1-2 minutes for the deployment to complete" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🧪 Test from Lovable.app:" -ForegroundColor Cyan
    Write-Host "   https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  Remember: Set NODE_ENV=production and ALLOWED_ORIGINS before going live!" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to update Cloud Run" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running: gcloud auth login" -ForegroundColor Yellow
}
