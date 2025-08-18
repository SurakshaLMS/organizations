import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUserLookup() {
  try {
    console.log('Testing user lookups...');
    
    // Test with string ID
    const userById = await prisma.user.findUnique({
      where: { userId: BigInt('1') }
    });
    
    console.log('User found with BigInt(1):', userById ? {
      id: userById.userId.toString(),
      email: userById.email,
      name: `${userById.firstName} ${userById.lastName || ''}`.trim()
    } : 'Not found');

    // Test direct number
    const userByDirectId = await prisma.user.findUnique({
      where: { userId: BigInt(1) }
    });
    
    console.log('User found with BigInt(1):', userByDirectId ? {
      id: userByDirectId.userId.toString(),
      email: userByDirectId.email,
      name: `${userByDirectId.firstName} ${userByDirectId.lastName || ''}`.trim()
    } : 'Not found');

    // List all users
    const allUsers = await prisma.user.findMany({
      take: 5
    });
    
    console.log('First 5 users:');
    allUsers.forEach(user => {
      console.log(`- ID: ${user.userId.toString()}, Email: ${user.email}, Name: ${`${user.firstName} ${user.lastName || ''}`.trim()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUserLookup();
