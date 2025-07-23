// Simple Raw SQL Cleanup for DateTime Corruption
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDateTimeCorruption() {
  console.log('🔧 Fixing datetime corruption with raw SQL...\n');
  
  try {
    // Use Prisma's $executeRawUnsafe for dynamic SQL
    console.log('1. Fixing organization_users table...');
    await prisma.$executeRawUnsafe(`
      UPDATE organization_users 
      SET updatedAt = NOW() 
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR updatedAt IS NULL 
         OR YEAR(updatedAt) < 1900
         OR updatedAt = '1900-01-01 00:00:00'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE organization_users 
      SET createdAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR createdAt IS NULL 
         OR YEAR(createdAt) < 1900
         OR createdAt = '1900-01-01 00:00:00'
    `);
    console.log('✅ organization_users table fixed');
    
    console.log('2. Fixing organization table...');
    await prisma.$executeRawUnsafe(`
      UPDATE organization 
      SET updatedAt = NOW() 
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR updatedAt IS NULL 
         OR YEAR(updatedAt) < 1900
         OR updatedAt = '1900-01-01 00:00:00'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE organization 
      SET createdAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR createdAt IS NULL 
         OR YEAR(createdAt) < 1900
         OR createdAt = '1900-01-01 00:00:00'
    `);
    console.log('✅ organization table fixed');
    
    console.log('3. Fixing cause table...');
    await prisma.$executeRawUnsafe(`
      UPDATE cause 
      SET updatedAt = NOW() 
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR updatedAt IS NULL 
         OR YEAR(updatedAt) < 1900
         OR updatedAt = '1900-01-01 00:00:00'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE cause 
      SET createdAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR createdAt IS NULL 
         OR YEAR(createdAt) < 1900
         OR createdAt = '1900-01-01 00:00:00'
    `);
    console.log('✅ cause table fixed');
    
    console.log('4. Fixing lecture table...');
    await prisma.$executeRawUnsafe(`
      UPDATE lecture 
      SET updatedAt = NOW() 
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR updatedAt IS NULL 
         OR YEAR(updatedAt) < 1900
         OR updatedAt = '1900-01-01 00:00:00'
    `);
    
    await prisma.$executeRawUnsafe(`
      UPDATE lecture 
      SET createdAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR createdAt IS NULL 
         OR YEAR(createdAt) < 1900
         OR createdAt = '1900-01-01 00:00:00'
    `);
    console.log('✅ lecture table fixed');
    
    // Test if we can now read the data
    console.log('\n📊 Verification:');
    try {
      const orgUserCount = await prisma.organizationUser.count();
      console.log(`✅ organization_users: ${orgUserCount} records (readable)`);
    } catch (e) {
      console.log('❌ organization_users still has issues');
    }
    
    try {
      const orgCount = await prisma.organization.count();
      console.log(`✅ organization: ${orgCount} records (readable)`);
    } catch (e) {
      console.log('❌ organization still has issues');
    }
    
    console.log('\n🎉 Database cleanup completed!');
    console.log('✅ All datetime corruption should now be resolved.');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDateTimeCorruption()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
