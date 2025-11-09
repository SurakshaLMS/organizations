# Test Login with Database Verification
# This script checks if login works and why it might fail

Write-Host "🔍 Login Troubleshooting Tool" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login"
$dbHost = "34.29.9.105"
$dbUser = "root"
$dbPass = "Skaveesha1355660@"
$dbName = "suraksha-lms-db"

# Get email from user
$email = Read-Host "Enter email to test"

Write-Host ""
Write-Host "Step 1: Checking if user exists in database..." -ForegroundColor Yellow

# Check user in database
$checkUserQuery = "SELECT id, email, first_name, last_name, is_active, LEFT(password, 10) as pwd FROM users WHERE email='$email'"
$userCheck = mysql -h $dbHost -u $dbUser -p"$dbPass" -D $dbName -e "$checkUserQuery" 2>&1

if ($userCheck -match "ERROR") {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    Write-Host $userCheck
    exit 1
}

Write-Host $userCheck
Write-Host ""

# Check if user has organizations
Write-Host "Step 2: Checking user's organizations..." -ForegroundColor Yellow
$orgQuery = "SELECT user_id, organization_id, role, is_verified FROM org_organization_users WHERE user_id IN (SELECT id FROM users WHERE email='$email')"
$orgCheck = mysql -h $dbHost -u $dbUser -p"$dbPass" -D $dbName -e "$orgQuery" 2>&1

Write-Host $orgCheck
Write-Host ""

# Now test login
Write-Host "Step 3: Testing login API..." -ForegroundColor Yellow
$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

Write-Host ""
Write-Host "Attempting login..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host ""
    Write-Host "User ID: $($response.user.id)" -ForegroundColor White
    Write-Host "Email: $($response.user.email)" -ForegroundColor White
    Write-Host "Name: $($response.user.name)" -ForegroundColor White
    Write-Host ""
    Write-Host "Access Token (first 60 chars):" -ForegroundColor Cyan
    Write-Host $response.accessToken.Substring(0, [Math]::Min(60, $response.accessToken.Length)) -ForegroundColor White
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = ""
    
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
    } catch {}
    
    Write-Host ""
    Write-Host "❌ LOGIN FAILED!" -ForegroundColor Red
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    Write-Host "Error Details: $errorBody" -ForegroundColor Red
    Write-Host ""
    
    if ($statusCode -eq 401) {
        Write-Host "💡 401 Unauthorized - Diagnosis:" -ForegroundColor Yellow
        Write-Host ""
        
        # Check if user exists
        if ($userCheck -notmatch $email) {
            Write-Host "❌ User NOT found in database" -ForegroundColor Red
            Write-Host "   Solution: Create user or check email spelling" -ForegroundColor White
        }
        elseif ($userCheck -match "is_active.*0") {
            Write-Host "❌ User account is DEACTIVATED (is_active=0)" -ForegroundColor Red
            Write-Host "   Solution: Run this SQL:" -ForegroundColor White
            Write-Host "   UPDATE users SET is_active=1 WHERE email='$email';" -ForegroundColor Cyan
        }
        elseif ($userCheck -notmatch '\$2b\$') {
            Write-Host "❌ Password is NULL or not bcrypt format" -ForegroundColor Red
            Write-Host "   Solution: Set a new password in database" -ForegroundColor White
        }
        else {
            Write-Host "❌ Password is INCORRECT" -ForegroundColor Red
            Write-Host "   The password you entered doesn't match database" -ForegroundColor White
            Write-Host ""
            Write-Host "   Try these common passwords:" -ForegroundColor Yellow
            Write-Host "   - Password123@" -ForegroundColor White
            Write-Host "   - password123" -ForegroundColor White
            Write-Host "   - 123456" -ForegroundColor White
        }
    }
    elseif ($statusCode -eq 403) {
        Write-Host "💡 403 Forbidden - CORS issue" -ForegroundColor Yellow
        Write-Host "   Run: .\enable-dev-mode-cloud-run.ps1" -ForegroundColor White
    }
    elseif ($statusCode -eq 429) {
        Write-Host "💡 429 Too Many Requests - Rate limited" -ForegroundColor Yellow
        Write-Host "   Wait 5 minutes and try again" -ForegroundColor White
    }
}
