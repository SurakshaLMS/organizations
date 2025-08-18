import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureTestUser() {
  try {
    // Check if user with ID 1 exists
    let user = await prisma.user.findUnique({
      where: { userId: BigInt(1) }
    });

    if (!user) {
      console.log('Test user not found, creating...');
      
      // Create test user
      user = await prisma.user.create({
        data: {
          userId: BigInt(1),
          email: 'test@test.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'test123' // Simple password for testing
        }
      });

      console.log('✅ Test user created:', {
        id: user.userId.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName || ''}`.trim()
      });
    } else {
      console.log('✅ Test user already exists:', {
        id: user.userId.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName || ''}`.trim()
      });
    }

    // Check total users count
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ensureTestUser();
