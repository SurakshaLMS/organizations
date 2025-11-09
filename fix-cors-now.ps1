# Fix CORS for Lovable.app - Quick Script
# Run this to add your Lovable.app origin to Cloud Run

Write-Host "🔧 Updating Cloud Run CORS Configuration..." -ForegroundColor Cyan
Write-Host ""

$lovableOrigin = "https://id-preview--ea005849-ee8b-421d-b766-ce5e23eea597.lovable.app"
$localhostOrigin = "http://localhost:8080"
$allowedOrigins = "$lovableOrigin,$localhostOrigin"

Write-Host "Adding origins:" -ForegroundColor Yellow
Write-Host "  - $lovableOrigin" -ForegroundColor Green
Write-Host "  - $localhostOrigin" -ForegroundColor Green
Write-Host ""

# Update Cloud Run
Write-Host "Updating Cloud Run service..." -ForegroundColor Cyan
gcloud run services update organizations `
  --region=europe-west1 `
  --set-env-vars "ALLOWED_ORIGINS=$allowedOrigins" `
  --project=earnest-radio-475808-j8

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! CORS configuration updated." -ForegroundColor Green
    Write-Host ""
    Write-Host "⏳ Wait 1-2 minutes for the deployment to complete, then test from your Lovable.app frontend." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🧪 Test URL: https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ ERROR: Failed to update Cloud Run. Check your gcloud authentication." -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running: gcloud auth login" -ForegroundColor Yellow
}
