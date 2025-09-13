# 🔄 Restart Development Server
# Run this after the DTO changes to apply the validation fix

Write-Host "🔧 Applying validation fix - restarting server..." -ForegroundColor Yellow
Write-Host ""

# Check if server is running and stop it
$nestProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*nest*" -or $_.CommandLine -like "*start:dev*" }

if ($nestProcess) {
    Write-Host "🛑 Stopping current server..." -ForegroundColor Red
    $nestProcess | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Clear npm cache (optional but helps with DTO changes)
Write-Host "🧹 Clearing cache..." -ForegroundColor Blue
npm run build --silent

# Start the server
Write-Host "🚀 Starting server with validation fix..." -ForegroundColor Green
Write-Host ""
Write-Host "The validation error should now be resolved!" -ForegroundColor Cyan
Write-Host "Test with: node test-final-validation-fix.js" -ForegroundColor Cyan
Write-Host ""

# Start the development server
npm run start:dev