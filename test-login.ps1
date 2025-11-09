# Quick Login Test Script
# Tests the login endpoint with sample credentials

Write-Host "🧪 Testing Login Endpoint..." -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login"
$email = Read-Host "Enter email"
$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Testing login for: $email" -ForegroundColor Yellow
Write-Host "URL: $apiUrl" -ForegroundColor Yellow
Write-Host ""

$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "User:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.user.id)" -ForegroundColor White
    Write-Host "  Email: $($response.user.email)" -ForegroundColor White
    Write-Host "  Name: $($response.user.name)" -ForegroundColor White
    Write-Host ""
    Write-Host "Access Token (first 50 chars):" -ForegroundColor Cyan
    Write-Host "  $($response.accessToken.Substring(0, [Math]::Min(50, $response.accessToken.Length)))..." -ForegroundColor White
    Write-Host ""
    Write-Host "Organizations:" -ForegroundColor Cyan
    foreach ($org in $response.user.organizations) {
        Write-Host "  - Org ID: $($org.organizationId), Role: $($org.role)" -ForegroundColor White
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ LOGIN FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "💡 401 Unauthorized - Possible causes:" -ForegroundColor Yellow
        Write-Host "  1. Invalid email or password" -ForegroundColor White
        Write-Host "  2. Account is deactivated (isActive=false)" -ForegroundColor White
        Write-Host "  3. Password hash mismatch in database" -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 Check database:" -ForegroundColor Yellow
        Write-Host "  SELECT userId, email, isActive, password FROM User WHERE email='$email';" -ForegroundColor White
    }
    elseif ($statusCode -eq 403) {
        Write-Host "💡 403 Forbidden - CORS issue:" -ForegroundColor Yellow
        Write-Host "  Run: .\enable-dev-mode-cloud-run.ps1" -ForegroundColor White
    }
    elseif ($statusCode -eq 429) {
        Write-Host "💡 429 Too Many Requests - Rate limit:" -ForegroundColor Yellow
        Write-Host "  Wait 5 minutes and try again" -ForegroundColor White
    }
}
