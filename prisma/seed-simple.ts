import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🌱 Starting simple seed...');

  // Create sample users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: await hashPassword('AdminPassword123!'),
        firstName: 'Admin',
        lastName: 'User',
      },
    }),
    prisma.user.create({
      data: {
        email: 'student@example.com',
        password: await hashPassword('StudentPassword123!'),
        firstName: 'Student',
        lastName: 'User',
      },
    }),
  ]);

  console.log('👥 Created users');

  // Create sample institutes
  const institutes = await Promise.all([
    prisma.institute.create({
      data: {
        name: 'University of Technology',
        code: 'UTECH001',
        email: 'admin@utech.edu',
        imageUrl: 'https://example.com/university.jpg',
      },
    }),
  ]);

  console.log('🏫 Created institutes');

  // Create sample organizations
  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        name: 'Computer Science Department',
        type: 'INSTITUTE',
        isPublic: true,
        instituteId: institutes[0].instituteId,
      },
    }),
  ]);

  console.log('🏢 Created organizations');

  // Create organization user relationships
  await prisma.organizationUser.create({
    data: {
      organizationId: organizations[0].organizationId,
      userId: users[0].userId,
      role: 'PRESIDENT',
      isVerified: true,
    },
  });

  console.log('👤 Created organization user relationships');
  console.log('✅ Simple seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
