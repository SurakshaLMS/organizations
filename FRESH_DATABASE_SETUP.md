# 🚀 Fresh Database Setup Guide

## Overview
This guide ensures your new database is configured to **prevent invalid datetime values** from day one.

## Prerequisites
- MySQL 5.7+ or MySQL 8.0+
- Node.js and npm installed
- Prisma CLI installed (`npm install -D prisma`)

---

## Quick Start (New Database)

### Option 1: Automatic Setup (Recommended)

```powershell
# 1. Configure environment
cp .env.example .env
# Edit .env and set your LAAS_DATABASE_URL

# 2. Run the setup script
.\setup-fresh-database.ps1
```

### Option 2: Manual Setup

Follow the steps below ⬇️

---

## Step-by-Step Setup

### Step 1: Configure MySQL Server

#### Windows (MySQL Installer)
1. Open MySQL Workbench or MySQL Command Line
2. Run:
```sql
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE';
```

#### Linux/Mac (Edit my.cnf)
1. Edit MySQL configuration:
```bash
sudo nano /etc/mysql/my.cnf
# or
sudo nano /etc/my.cnf
```

2. Add under `[mysqld]`:
```ini
[mysqld]
sql_mode = "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE"
explicit_defaults_for_timestamp = ON
```

3. Restart MySQL:
```bash
sudo systemctl restart mysql
# or
sudo service mysql restart
```

### Step 2: Verify MySQL Configuration

```powershell
# Connect to MySQL and check
mysql -u root -p

# Run this query:
SELECT @@GLOBAL.sql_mode;
```

**Expected output should include:**
- `STRICT_TRANS_TABLES`
- `NO_ZERO_DATE`
- `NO_ZERO_IN_DATE`

### Step 3: Create Database

```sql
CREATE DATABASE IF NOT EXISTS your_database_name 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
```

### Step 4: Configure .env File

```env
LAAS_DATABASE_URL="mysql://username:password@localhost:3306/your_database_name"
```

### Step 5: Run Prisma Migrations

#### Option A: Using Migrations (Production)
```powershell
# Generate Prisma Client
npx prisma generate

# Run all migrations (creates tables with proper constraints)
npx prisma migrate deploy
```

#### Option B: Using Push (Development)
```powershell
# Push schema to database
npx prisma db push
```

### Step 6: Apply Datetime Constraints

```powershell
# This ensures all datetime columns have proper defaults
npx prisma db execute --file prisma/migrations/20251018000001_add_datetime_constraints/migration.sql --schema prisma/schema.prisma
```

### Step 7: Verify Setup

```powershell
# Check tables were created
npx prisma db execute --file verify-database-setup.sql --schema prisma/schema.prisma
```

---

## Files Created

### Core Files:
1. ✅ `setup-fresh-database.ps1` - Automated setup script
2. ✅ `prisma/migrations/20251018000001_add_datetime_constraints/migration.sql` - Datetime constraints
3. ✅ `fix-datetime-reusable.sql` - Cleanup script for existing data
4. ✅ `verify-database-setup.sql` - Verification queries

### Migration Structure:
```
prisma/migrations/
├── 00000000000000_mysql_config/
│   └── migration.sql (MySQL configuration)
├── 20251018000001_add_datetime_constraints/
│   └── migration.sql (Datetime constraints)
└── [your existing migrations...]
```

---

## What Gets Configured

### ✅ MySQL Server Settings:
- `STRICT_TRANS_TABLES` - Rejects invalid data
- `NO_ZERO_DATE` - Prevents '0000-00-00' dates
- `NO_ZERO_IN_DATE` - Prevents dates like '2024-00-15'

### ✅ Table Constraints:
All datetime columns get:
- `NOT NULL` - Required fields can't be null
- `DEFAULT CURRENT_TIMESTAMP` - Auto-set on insert
- `ON UPDATE CURRENT_TIMESTAMP` - Auto-update on modification

### ✅ Tables Protected:
- org_organizations
- org_organization_users
- org_causes
- org_lectures
- org_assignments
- org_documentation
- users
- institutes
- institute_user

---

## Testing Your Setup

### Test 1: Verify MySQL Mode
```sql
SELECT @@SESSION.sql_mode;
```
Should include: `NO_ZERO_DATE,NO_ZERO_IN_DATE`

### Test 2: Try Inserting Invalid Date (Should Fail)
```sql
-- This should be REJECTED
INSERT INTO org_organizations (name, type, createdAt, updatedAt) 
VALUES ('Test', 'GLOBAL', '0000-00-00 00:00:00', '0000-00-00 00:00:00');
```
**Expected:** Error message rejecting the invalid date

### Test 3: Insert Valid Data (Should Work)
```sql
-- This should SUCCEED
INSERT INTO org_organizations (name, type) 
VALUES ('Test Organization', 'GLOBAL');
-- createdAt and updatedAt auto-set to NOW()
```

---

## Maintenance

### When Importing External Data
If you import data from external sources that might have invalid dates:

```powershell
# Run the cleanup script
npx prisma db execute --file fix-datetime-reusable.sql --schema prisma/schema.prisma
```

### When Adding New Tables
Update these files:
1. `fix-datetime-reusable.sql` - Add cleanup for new table
2. `20251018000001_add_datetime_constraints/migration.sql` - Add constraints for new table

---

## Troubleshooting

### Error: "Incorrect datetime value"
**Cause:** Existing invalid data in database  
**Solution:**
```powershell
npx prisma db execute --file fix-datetime-reusable.sql --schema prisma/schema.prisma
```

### Error: "SET GLOBAL requires SUPER privilege"
**Cause:** No admin access to MySQL  
**Solution:** Either:
1. Ask your DB admin to set it globally, OR
2. Set it per session (already done in migrations)

### Migration Fails
**Cause:** MySQL mode not configured  
**Solution:**
1. Configure MySQL as shown in Step 1
2. Restart MySQL server
3. Try migration again

---

## Summary

✅ **Prevention:** MySQL configured to reject invalid dates  
✅ **Protection:** All tables have datetime constraints  
✅ **Cleanup:** Script available to fix existing data  
✅ **Automation:** One-command setup available  

---

## Quick Commands Reference

```powershell
# Fresh database setup
.\setup-fresh-database.ps1

# Fix existing data
npx prisma db execute --file fix-datetime-reusable.sql --schema prisma/schema.prisma

# Verify configuration
npx prisma db execute --file verify-database-setup.sql --schema prisma/schema.prisma

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset
```

---

*Last updated: October 18, 2025*
