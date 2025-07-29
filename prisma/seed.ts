import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function futureDateFromNow(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.assignment.deleteMany();
    await prisma.documentation.deleteMany();
    await prisma.lecture.deleteMany();
    await prisma.cause.deleteMany();
    await prisma.organizationUser.deleteMany();
    await prisma.instituteUser.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
    await prisma.institute.deleteMany();
    console.log('✅ Cleaned existing data');

    // Create Institutes
    console.log('🏛️ Creating institutes...');
    const institutes: any[] = [];
    const instituteNames = ['Harvard University', 'Stanford University', 'MIT', 'Yale University', 'Princeton University'];
    
    for (let i = 0; i < instituteNames.length; i++) {
      const institute = await prisma.institute.create({
        data: {
          name: instituteNames[i],
          imageUrl: `https://education-images.com/institute-${i + 1}.jpg`,
        },
      });
      institutes.push(institute);
    }
    console.log(`✅ Created ${institutes.length} institutes`);

    // Create Users
    console.log('👥 Creating users...');
    const users: any[] = [];
    for (let i = 1; i <= 20; i++) {
      const user = await prisma.user.create({
        data: {
          email: `user${i}@university.edu`,
          password: await hashPassword(`Password${i}!`),
          name: `User ${i}`,
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // Create Organizations
    console.log('🏢 Creating organizations...');
    const organizations: any[] = [];
    const orgData = [
      { name: 'Computer Science Club', type: 'INSTITUTE', isPublic: true, shouldVerifyEnrollment: false, enrollmentKey: 'CS2024' },
      { name: 'Math Society', type: 'INSTITUTE', isPublic: true, shouldVerifyEnrollment: true, enrollmentKey: 'MATH2024' },
      { name: 'Physics Lab', type: 'INSTITUTE', isPublic: false, shouldVerifyEnrollment: true, enrollmentKey: 'PHYSICS2024' },
      { name: 'Chemistry Group', type: 'GLOBAL', isPublic: true, shouldVerifyEnrollment: false, enrollmentKey: 'CHEM2024' },
      { name: 'Biology Club', type: 'GLOBAL', isPublic: false, shouldVerifyEnrollment: true, enrollmentKey: 'BIO2024' },
    ];
    
    for (let i = 0; i < orgData.length; i++) {
      const organization = await prisma.organization.create({
        data: {
          name: orgData[i].name,
          type: orgData[i].type as 'INSTITUTE' | 'GLOBAL',
          isPublic: orgData[i].isPublic,
          shouldVerifyEnrollment: orgData[i].shouldVerifyEnrollment,
          enrollmentKey: orgData[i].enrollmentKey,
          instituteId: orgData[i].type === 'INSTITUTE' ? institutes[i % institutes.length].instituteId : null,
        },
      });
      organizations.push(organization);
    }
    console.log(`✅ Created ${organizations.length} organizations`);

    // Create Causes
    console.log('🎯 Creating causes...');
    const causes: any[] = [];
    const causeTopics = ['Climate Change', 'Digital Education', 'Health Awareness', 'Community Service', 'Technology Innovation'];
    
    for (let i = 0; i < causeTopics.length; i++) {
      const orgId = organizations[i % organizations.length].organizationId;
      console.log(`Creating cause for organization ID: ${orgId} (type: ${typeof orgId})`);
      
      const cause = await prisma.cause.create({
        data: {
          organizationId: orgId, // It's already a BigInt from the database
          title: causeTopics[i],
          description: `Initiative focused on ${causeTopics[i].toLowerCase()}`,
          introVideoUrl: `https://videos.edu.com/cause-${i + 1}.mp4`,
          isPublic: Math.random() > 0.3,
        },
      });
      causes.push(cause);
    }
    console.log(`✅ Created ${causes.length} causes`);

    // Create Lectures
    console.log('📚 Creating lectures...');
    const lectures: any[] = [];
    for (let i = 0; i < 20; i++) {
      const cause = causes[i % causes.length];
      const lecture = await prisma.lecture.create({
        data: {
          causeId: cause.causeId,
          title: `Lecture ${i + 1}: ${cause.title}`,
          description: `Detailed lecture about ${cause.title.toLowerCase()}`,
          content: `This lecture covers important aspects of ${cause.title.toLowerCase()}.`,
          venue: i % 2 === 0 ? 'Main Hall' : 'Online Platform',
          mode: i % 2 === 0 ? 'physical' : 'online',
          timeStart: futureDateFromNow(i + 1),
          timeEnd: futureDateFromNow(i + 1),
          liveLink: i % 2 === 1 ? `https://meet.google.com/lecture-${i + 1}` : null,
          liveMode: i % 2 === 1 ? 'meet' : null,
          isPublic: Math.random() > 0.3,
        },
      });
      lectures.push(lecture);
    }
    console.log(`✅ Created ${lectures.length} lectures`);

    // Create Assignments
    console.log('📝 Creating assignments...');
    for (let i = 0; i < 15; i++) {
      const cause = causes[i % causes.length];
      await prisma.assignment.create({
        data: {
          causeId: cause.causeId,
          title: `Assignment ${i + 1}: ${cause.title}`,
          description: `Assignment related to ${cause.title.toLowerCase()}`,
          dueDate: futureDateFromNow(7 + i),
        },
      });
    }
    console.log('✅ Created 15 assignments');

    // Create Documentation
    console.log('📄 Creating documentation...');
    for (let i = 0; i < 30; i++) {
      const lecture = lectures[i % lectures.length];
      await prisma.documentation.create({
        data: {
          lectureId: lecture.lectureId,
          title: `Documentation for ${lecture.title}`,
          description: `Supporting materials for ${lecture.title}`,
          content: `Detailed documentation and resources.`,
          docUrl: `https://docs.edu.com/doc-${i + 1}.pdf`,
        },
      });
    }
    console.log('✅ Created 30 documentation entries');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`🏛️  Institutes: ${institutes.length}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏢 Organizations: ${organizations.length}`);
    console.log(`🎯 Causes: ${causes.length}`);
    console.log(`📚 Lectures: ${lectures.length}`);
    console.log(`📝 Assignments: 15`);
    console.log(`📄 Documentation: 30`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
