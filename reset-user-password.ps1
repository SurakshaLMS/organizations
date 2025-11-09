# Reset User Password to Known Value
# This will set a user's password to "Password123@" for testing

Write-Host "🔐 Password Reset Tool" -ForegroundColor Cyan
Write-Host ""

$dbHost = "34.29.9.105"
$dbUser = "root"
$dbPass = "Skaveesha1355660@"
$dbName = "suraksha-lms-db"

# Get email
$email = Read-Host "Enter user email to reset password"

# Check if user exists
Write-Host ""
Write-Host "Checking if user exists..." -ForegroundColor Yellow
$checkUser = mysql -h $dbHost -u $dbUser -p"$dbPass" -D $dbName -e "SELECT id, email, first_name, is_active FROM users WHERE email='$email'" 2>&1

if ($checkUser -match "ERROR" -or $checkUser -notmatch $email) {
    Write-Host "❌ User not found with email: $email" -ForegroundColor Red
    exit 1
}

Write-Host $checkUser
Write-Host ""

# Bcrypt hash for "Password123@" with cost 12
$newPasswordHash = "`$2b`$12`$f0pR95MwDCIW7JJZ60b1MOxykKGY6tFCqN3QvJ8z0vLzK.YQxJ9CO"

Write-Host "Setting password to: Password123@" -ForegroundColor Yellow
Write-Host ""

# Update password
$updateQuery = "UPDATE users SET password='$newPasswordHash', is_active=1 WHERE email='$email'"
$result = mysql -h $dbHost -u $dbUser -p"$dbPass" -D $dbName -e "$updateQuery" 2>&1

if ($result -match "ERROR") {
    Write-Host "❌ Failed to update password!" -ForegroundColor Red
    Write-Host $result
    exit 1
}

Write-Host "✅ Password updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Login credentials:" -ForegroundColor Cyan
Write-Host "  Email: $email" -ForegroundColor White
Write-Host "  Password: Password123@" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test now at:" -ForegroundColor Yellow
Write-Host "  https://organizations-923357517997.europe-west1.run.app/organization/api/v1/auth/login" -ForegroundColor White
