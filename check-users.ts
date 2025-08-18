import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking users in database...');
  
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      email: true,
      firstName: true,
      lastName: true,
      password: true,
      createdAt: true,
    },
    take: 20 // Get more users
  });

  console.log(`Found ${users.length} users:`);
  users.forEach((user, index) => {
    const fullName = `${user.firstName} ${user.lastName || ''}`.trim();
    console.log(`${index + 1}. ID: ${user.userId}, Email: ${user.email}, Name: ${fullName}, Has Password: ${!!user.password}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
