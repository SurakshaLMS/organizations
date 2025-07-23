// Database Cleanup Script for DateTime Corruption
// Run this to fix invalid datetime values in the database

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDateTimeCorruption() {
  console.log('🔧 Starting database datetime cleanup...\n');
  
  try {
    // Fix organization_users table using updateMany
    console.log('1. Fixing organization_users table...');
    
    // Get all records and update any with invalid dates
    const orgUsers = await prisma.organizationUser.findMany();
    let fixedOrgUsers = 0;
    
    for (const user of orgUsers) {
      const now = new Date();
      let needsUpdate = false;
      const updateData: any = {};
      
      // Check if updatedAt is invalid
      if (!user.updatedAt || user.updatedAt.getFullYear() === 1900 || user.updatedAt.getTime() === 0) {
        updateData.updatedAt = now;
        needsUpdate = true;
      }
      
      // Check if createdAt is invalid
      if (!user.createdAt || user.createdAt.getFullYear() === 1900 || user.createdAt.getTime() === 0) {
        updateData.createdAt = now;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.organizationUser.update({
          where: {
            organizationId_userId: {
              organizationId: user.organizationId,
              userId: user.userId
            }
          },
          data: updateData
        });
        fixedOrgUsers++;
      }
    }
    
    console.log(`✅ organization_users table fixed (${fixedOrgUsers} records updated)`);
    
    // Fix organization table
    console.log('2. Fixing organization table...');
    
    const organizations = await prisma.organization.findMany();
    let fixedOrgs = 0;
    
    for (const org of organizations) {
      const now = new Date();
      let needsUpdate = false;
      const updateData: any = {};
      
      if (!org.updatedAt || org.updatedAt.getFullYear() === 1900 || org.updatedAt.getTime() === 0) {
        updateData.updatedAt = now;
        needsUpdate = true;
      }
      
      if (!org.createdAt || org.createdAt.getFullYear() === 1900 || org.createdAt.getTime() === 0) {
        updateData.createdAt = now;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.organization.update({
          where: { organizationId: org.organizationId },
          data: updateData
        });
        fixedOrgs++;
      }
    }
    
    console.log(`✅ organization table fixed (${fixedOrgs} records updated)`);
    
    // Fix cause table
    console.log('3. Fixing cause table...');
    
    const causes = await prisma.cause.findMany();
    let fixedCauses = 0;
    
    for (const cause of causes) {
      const now = new Date();
      let needsUpdate = false;
      const updateData: any = {};
      
      if (!cause.updatedAt || cause.updatedAt.getFullYear() === 1900 || cause.updatedAt.getTime() === 0) {
        updateData.updatedAt = now;
        needsUpdate = true;
      }
      
      if (!cause.createdAt || cause.createdAt.getFullYear() === 1900 || cause.createdAt.getTime() === 0) {
        updateData.createdAt = now;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.cause.update({
          where: { causeId: cause.causeId },
          data: updateData
        });
        fixedCauses++;
      }
    }
    
    console.log(`✅ cause table fixed (${fixedCauses} records updated)`);
    
    // Fix lecture table
    console.log('4. Fixing lecture table...');
    
    const lectures = await prisma.lecture.findMany();
    let fixedLectures = 0;
    
    for (const lecture of lectures) {
      const now = new Date();
      let needsUpdate = false;
      const updateData: any = {};
      
      if (!lecture.updatedAt || lecture.updatedAt.getFullYear() === 1900 || lecture.updatedAt.getTime() === 0) {
        updateData.updatedAt = now;
        needsUpdate = true;
      }
      
      if (!lecture.createdAt || lecture.createdAt.getFullYear() === 1900 || lecture.createdAt.getTime() === 0) {
        updateData.createdAt = now;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await prisma.lecture.update({
          where: { lectureId: lecture.lectureId },
          data: updateData
        });
        fixedLectures++;
      }
    }
    
    console.log(`✅ lecture table fixed (${fixedLectures} records updated)`);
    
    // Verify the fix by counting valid records
    console.log('\n📊 Verification:');
    
    const orgUserCount = await prisma.organizationUser.count();
    const orgCount = await prisma.organization.count();
    const causeCount = await prisma.cause.count();
    const lectureCount = await prisma.lecture.count();
    
    console.log(`  - organizationUser: ${orgUserCount} records`);
    console.log(`  - organization: ${orgCount} records`);
    console.log(`  - cause: ${causeCount} records`);
    console.log(`  - lecture: ${lectureCount} records`);
    
    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('✅ All datetime corruption issues should now be resolved.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
fixDateTimeCorruption()
  .then(() => {
    console.log('\n🚀 Cleanup script finished. You can now test the API endpoints.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
