import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  console.log('📊 Database Content Summary:');
  
  const [
    institutes,
    users,
    instituteUsers,
    organizations,
    organizationUsers,
    causes,
    lectures,
    assignments,
    documentation
  ] = await Promise.all([
    prisma.institute.count(),
    prisma.user.count(),
    prisma.instituteUser.count(),
    prisma.organization.count(),
    prisma.organizationUser.count(),
    prisma.cause.count(),
    prisma.lecture.count(),
    prisma.assignment.count(),
    prisma.documentation.count()
  ]);

  console.log(`🏛️  Institutes: ${institutes}`);
  console.log(`👥 Users: ${users}`);
  console.log(`🎓 Institute Users: ${instituteUsers}`);
  console.log(`🏢 Organizations: ${organizations}`);
  console.log(`👤 Organization Users: ${organizationUsers}`);
  console.log(`🎯 Causes: ${causes}`);
  console.log(`📚 Lectures: ${lectures}`);
  console.log(`📝 Assignments: ${assignments}`);
  console.log(`📄 Documentation: ${documentation}`);

  // Show some sample data
  console.log('\n📋 Sample Data:');
  
  const sampleOrg = await prisma.organization.findFirst({
    include: {
      organizationUsers: {
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        }
      },
      causes: {
        include: {
          lectures: true,
          assignments: true
        }
      },
      institute: {
        select: { name: true }
      }
    }
  });

  if (sampleOrg) {
    console.log(`\n🏢 Sample Organization: ${sampleOrg.name}`);
    console.log(`   Type: ${sampleOrg.type}`);
    console.log(`   Public: ${sampleOrg.isPublic}`);
    console.log(`   Institute: ${sampleOrg.institute?.name || 'None'}`);
    console.log(`   Members: ${sampleOrg.organizationUsers.length}`);
    console.log(`   Causes: ${sampleOrg.causes.length}`);
    
    if (sampleOrg.causes.length > 0) {
      const cause = sampleOrg.causes[0];
      console.log(`\n🎯 Sample Cause: ${cause.title}`);
      console.log(`   Lectures: ${cause.lectures.length}`);
      console.log(`   Assignments: ${cause.assignments.length}`);
    }
  }

  await prisma.$disconnect();
}

checkData().catch(console.error);
