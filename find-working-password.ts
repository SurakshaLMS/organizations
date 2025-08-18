import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://admin:Skaveesha1355660@database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com:3306/laas?connection_limit=10&pool_timeout=120&connect_timeout=120"
    }
  }
});

async function findWorkingPassword() {
  try {
    console.log('🔍 Testing extensive password list to find what works...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'ia@gmail.com' },
      select: { password: true, email: true }
    });

    if (!user?.password) {
      console.log('❌ User not found or no password');
      return;
    }

    console.log(`Testing against: ${user.email}`);
    console.log(`Hash: ${user.password}`);

    // Extended password list based on common LaaS patterns
    const passwords = [
      // Variations of Password123@
      'Password123@',
      'password123@',
      'Password123!',
      'password123!',
      'Password123',
      'password123',
      
      // Common default passwords
      'admin123',
      'Admin123',
      'Admin123@',
      'admin123@',
      'laas123',
      'Laas123',
      'Laas123@',
      
      // Simple passwords
      '123456',
      'password',
      'Password',
      'admin',
      'Admin',
      'test',
      'Test',
      'test123',
      'Test123',
      
      // Academic system defaults
      'student123',
      'Student123',
      'user123',
      'User123',
      'demo123',
      'Demo123',
      
      // System defaults
      'changeme',
      'ChangeMe',
      'welcome',
      'Welcome',
      'default',
      'Default',
      'system',
      'System'
    ];

    console.log(`\n🧪 Testing ${passwords.length} possible passwords...`);

    for (let i = 0; i < passwords.length; i++) {
      const testPassword = passwords[i];
      try {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log(`\n🎉 SUCCESS! Password found: "${testPassword}"`);
          console.log(`✅ This password works for ${user.email}`);
          return testPassword;
        }
        
        // Show progress
        if (i % 10 === 0) {
          console.log(`   Tested ${i}/${passwords.length} passwords...`);
        }
      } catch (error) {
        console.log(`❌ Error testing "${testPassword}": ${error.message}`);
      }
    }

    console.log('\n❌ No matching password found in the test list');
    
    // Try to check if there's a pattern with other users who have the same hash
    const sameHashUsers = await prisma.user.findMany({
      where: { 
        password: user.password,
        email: { not: user.email }
      },
      select: { email: true, firstName: true, lastName: true },
      take: 3
    });

    if (sameHashUsers.length > 0) {
      console.log(`\n🔍 Found ${sameHashUsers.length} other users with the same password hash:`);
      sameHashUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.firstName} ${u.lastName || ''})`);
      });
      console.log('This suggests they all have the same default password.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findWorkingPassword();
