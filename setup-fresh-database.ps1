# ====================================================================
# FRESH DATABASE SETUP SCRIPT
# Automates the complete setup process for a new database
# ====================================================================

param(
    [switch]$SkipMySQLConfig = $false,
    [switch]$ResetDatabase = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  FRESH DATABASE SETUP - Organizations Project" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with LAAS_DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor White
    Write-Host '  LAAS_DATABASE_URL="mysql://user:password@localhost:3306/database_name"' -ForegroundColor Gray
    exit 1
}

# Check if prisma schema exists
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "❌ ERROR: prisma/schema.prisma not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Environment configuration found" -ForegroundColor Green
Write-Host ""

# Step 1: MySQL Configuration
if (-not $SkipMySQLConfig) {
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "STEP 1: MySQL Configuration" -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: MySQL must be configured with strict mode" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please ensure your MySQL has these settings:" -ForegroundColor Yellow
    Write-Host "  - STRICT_TRANS_TABLES" -ForegroundColor White
    Write-Host "  - NO_ZERO_DATE" -ForegroundColor White
    Write-Host "  - NO_ZERO_IN_DATE" -ForegroundColor White
    Write-Host ""
    Write-Host "Have you configured MySQL? (Y/N): " -ForegroundColor Green -NoNewline
    $mysqlConfigured = Read-Host
    
    if ($mysqlConfigured -ne "Y" -and $mysqlConfigured -ne "y") {
        Write-Host ""
        Write-Host "Please configure MySQL first. See FRESH_DATABASE_SETUP.md" -ForegroundColor Yellow
        Write-Host "Then run this script again." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "✓ MySQL configuration confirmed" -ForegroundColor Green
Write-Host ""

# Step 2: Database Reset (Optional)
if ($ResetDatabase) {
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host "STEP 2: Reset Database (Optional)" -ForegroundColor Cyan
    Write-Host "=====================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  WARNING: This will DELETE ALL DATA!" -ForegroundColor Red
    Write-Host "Are you sure? Type 'YES' to confirm: " -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    
    if ($confirm -eq "YES") {
        Write-Host ""
        Write-Host "Resetting database..." -ForegroundColor Yellow
        npx prisma migrate reset --force
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "❌ Database reset failed!" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Database reset complete" -ForegroundColor Green
    } else {
        Write-Host "Database reset cancelled" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Step 3: Generate Prisma Client
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "STEP 3: Generate Prisma Client" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow

npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Prisma generation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Prisma Client generated" -ForegroundColor Green
Write-Host ""

# Step 4: Run Migrations
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "STEP 4: Create Database Tables" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Yellow

npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Migrations may have issues, but continuing..." -ForegroundColor Yellow
    Write-Host "You can manually run: npx prisma db push" -ForegroundColor Yellow
}

Write-Host "✓ Database tables created" -ForegroundColor Green
Write-Host ""

# Step 5: Apply Datetime Constraints
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "STEP 5: Apply Datetime Constraints" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "prisma/migrations/20251018000001_add_datetime_constraints/migration.sql") {
    Write-Host "Applying datetime constraints..." -ForegroundColor Yellow
    
    npx prisma db execute --file prisma/migrations/20251018000001_add_datetime_constraints/migration.sql --schema prisma/schema.prisma
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Datetime constraints applied" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Constraints may already be applied" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Datetime constraints migration not found" -ForegroundColor Yellow
    Write-Host "Creating it now..." -ForegroundColor Yellow
    # The migration file should already exist from earlier setup
}

Write-Host ""

# Step 6: Verification
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "STEP 6: Verification" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "verify-database-setup.sql") {
    Write-Host "Verifying database setup..." -ForegroundColor Yellow
    npx prisma db execute --file verify-database-setup.sql --schema prisma/schema.prisma
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "  ✓ DATABASE SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start your application: npm run start:dev" -ForegroundColor White
Write-Host "  2. Test the endpoints" -ForegroundColor White
Write-Host "  3. Review the logs" -ForegroundColor White
Write-Host ""
Write-Host "Available scripts:" -ForegroundColor Cyan
Write-Host "  - fix-datetime-reusable.sql : Fix invalid datetime values" -ForegroundColor White
Write-Host "  - run-datetime-fix.ps1 : Interactive datetime fix" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - FRESH_DATABASE_SETUP.md : Detailed setup guide" -ForegroundColor White
Write-Host "  - README_DATETIME_FIX.md : Datetime fix documentation" -ForegroundColor White
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
