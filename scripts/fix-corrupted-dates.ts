/**
 * Database Data Cleaning Script
 * Fixes corrupted datetime values with zero day/month values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanCorruptedDatetimes() {
  console.log('🔧 Starting database datetime cleanup...');
  
  try {
    // Fix corrupted dates in the cause table
    console.log('Checking cause table for corrupted dates...');
    
    // Use raw SQL to fix zero dates
    await prisma.$executeRaw`
      UPDATE cause 
      SET updatedAt = COALESCE(createdAt, NOW())
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR YEAR(updatedAt) < 1900
    `;
    
    await prisma.$executeRaw`
      UPDATE cause 
      SET createdAt = NOW()
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
         OR YEAR(createdAt) < 1900
    `;
    
    // Fix corrupted dates in other tables
    console.log('Checking organization table for corrupted dates...');
    await prisma.$executeRaw`
      UPDATE organization 
      SET updatedAt = COALESCE(createdAt, NOW())
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR YEAR(updatedAt) < 1900
    `;
    
    await prisma.$executeRaw`
      UPDATE organization 
      SET createdAt = NOW()
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
         OR YEAR(createdAt) < 1900
    `;
    
    console.log('Checking lecture table for corrupted dates...');
    await prisma.$executeRaw`
      UPDATE lecture 
      SET updatedAt = COALESCE(createdAt, NOW())
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR YEAR(updatedAt) < 1900
    `;
    
    await prisma.$executeRaw`
      UPDATE lecture 
      SET createdAt = NOW()
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
         OR YEAR(createdAt) < 1900
    `;
    
    console.log('Checking user table for corrupted dates...');
    await prisma.$executeRaw`
      UPDATE user 
      SET updatedAt = COALESCE(createdAt, NOW())
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR YEAR(updatedAt) < 1900
    `;
    
    await prisma.$executeRaw`
      UPDATE user 
      SET createdAt = NOW()
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
         OR YEAR(createdAt) < 1900
    `;
    
    console.log('Checking institute table for corrupted dates...');
    await prisma.$executeRaw`
      UPDATE institute 
      SET updatedAt = COALESCE(createdAt, NOW())
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR YEAR(updatedAt) < 1900
    `;
    
    await prisma.$executeRaw`
      UPDATE institute 
      SET createdAt = NOW()
      WHERE createdAt = '0000-00-00 00:00:00' 
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
         OR YEAR(createdAt) < 1900
    `;
    
    // Check for remaining corrupted dates
    const corruptedCauses = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM cause 
      WHERE updatedAt = '0000-00-00 00:00:00' 
         OR createdAt = '0000-00-00 00:00:00'
         OR DAY(updatedAt) = 0 
         OR MONTH(updatedAt) = 0
         OR DAY(createdAt) = 0 
         OR MONTH(createdAt) = 0
    `;
    
    console.log('✅ Database datetime cleanup completed successfully!');
    console.log('Remaining corrupted cause dates:', corruptedCauses);
    
  } catch (error) {
    console.error('❌ Error during datetime cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanCorruptedDatetimes()
    .then(() => {
      console.log('🎉 Datetime cleanup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanCorruptedDatetimes };
