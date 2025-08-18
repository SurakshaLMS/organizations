import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearLaasOrgTables() {
  console.log('🧹 CLEARING LAAS ORG TABLES FOR FRESH MIGRATION');
  console.log('==================================================');

  try {
    // Clear tables in correct order (to handle foreign key constraints)
    console.log('1️⃣ Clearing org_assignments...');
    const deletedAssignments = await prisma.assignment.deleteMany();
    console.log(`   ✅ Deleted ${deletedAssignments.count} assignments`);

    console.log('2️⃣ Clearing org_organization_users...');
    const deletedOrgUsers = await prisma.organizationUser.deleteMany();
    console.log(`   ✅ Deleted ${deletedOrgUsers.count} organization users`);

    console.log('3️⃣ Clearing org_lectures...');
    const deletedLectures = await prisma.lecture.deleteMany();
    console.log(`   ✅ Deleted ${deletedLectures.count} lectures`);

    console.log('4️⃣ Clearing org_documentation...');
    const deletedDocumentation = await prisma.documentation.deleteMany();
    console.log(`   ✅ Deleted ${deletedDocumentation.count} documentation`);

    console.log('5️⃣ Clearing org_causes...');
    const deletedCauses = await prisma.cause.deleteMany();
    console.log(`   ✅ Deleted ${deletedCauses.count} causes`);

    console.log('6️⃣ Clearing org_organizations...');
    const deletedOrganizations = await prisma.organization.deleteMany();
    console.log(`   ✅ Deleted ${deletedOrganizations.count} organizations`);

    console.log('✅ All org tables cleared successfully!');
    console.log('Ready for fresh migration...');

  } catch (error) {
    console.error('❌ Error clearing tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearLaasOrgTables();
