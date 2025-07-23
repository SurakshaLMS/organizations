import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking users in database...');
  
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      email: true,
      name: true,
      password: true,
      createdAt: true,
    },
    take: 20 // Get more users
  });

  console.log(`Found ${users.length} users:`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.userId}, Email: ${user.email}, Name: ${user.name}, Has Password: ${!!user.password}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
