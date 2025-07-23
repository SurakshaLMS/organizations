// Check Database Tables
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    // Show all tables in the database
    const tables = await prisma.$queryRaw`SHOW TABLES`;
    console.log('📋 Tables in database:', tables);
    
    // Try to count records in organization table if it exists
    try {
      const orgCount = await prisma.organization.count();
      console.log(`✅ organization table: ${orgCount} records`);
    } catch (e) {
      console.log('❌ organization table does not exist');
    }
    
    // Try to count records in organizationUser table if it exists
    try {
      const orgUserCount = await prisma.organizationUser.count();
      console.log(`✅ organization_users table: ${orgUserCount} records`);
    } catch (e) {
      console.log('❌ organization_users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
