import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://admin:Skaveesha1355660@database-1.c218yqq22nq7.us-east-1.rds.amazonaws.com:3306/laas?connection_limit=10&pool_timeout=120&connect_timeout=120"
    }
  }
});

async function analyzeAllPasswords() {
  try {
    console.log('🔍 Analyzing ALL password formats in LaaS database');
    
    // Get all users with passwords
    const users = await prisma.user.findMany({
      where: {
        password: {
          not: null
        }
      },
      select: {
        userId: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true
      },
      orderBy: { userId: 'asc' }
    });

    console.log(`📊 Found ${users.length} users with passwords\n`);
    
    // Group by password patterns
    const patterns = new Map();
    
    for (const user of users) {
      let pattern = 'unknown';
      
      if (user.password?.startsWith('$2a$')) pattern = 'bcrypt-2a';
      else if (user.password?.startsWith('$2b$')) pattern = 'bcrypt-2b';
      else if (user.password?.includes(':')) pattern = 'encrypted-colon';
      else if (user.password?.length === 32) pattern = 'md5-like';
      else if (user.password?.length === 64) pattern = 'sha256-like';
      else if (user.password) pattern = `other-length-${user.password.length}`;
      
      if (!patterns.has(pattern)) patterns.set(pattern, []);
      patterns.get(pattern).push({
        userId: user.userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName || ''}`.trim(),
        hash: user.password?.substring(0, 30) + '...',
        fullLength: user.password?.length
      });
    }

    console.log('📈 Password format analysis:');
    for (const [pattern, users] of patterns.entries()) {
      console.log(`\n🔐 ${pattern.toUpperCase()} (${users.length} users):`);
      for (const user of users.slice(0, 3)) { // Show first 3 of each type
        console.log(`   ${user.userId}: ${user.email} (${user.name})`);
        console.log(`   Hash: ${user.hash} (Length: ${user.fullLength})`);
      }
      if (users.length > 3) {
        console.log(`   ... and ${users.length - 3} more`);
      }
    }

    // Test common passwords against the patterns
    const commonPasswords = [
      'Password123@',
      'password123', 
      'Password123',
      'admin123',
      '123456',
      'password',
      'test123'
    ];

    console.log('\n🧪 Testing common passwords against existing hashes:');
    
    // Take first user from each pattern type
    for (const [pattern, patternUsers] of patterns.entries()) {
      if (patternUsers.length > 0) {
        const testUser = patternUsers[0];
        console.log(`\n🔍 Testing against ${pattern} format (User: ${testUser.email}):`);
        
        // Get full user data
        const fullUser = users.find(u => u.userId === testUser.userId);
        if (!fullUser?.password) continue;

        for (const testPassword of commonPasswords) {
          try {
            if (pattern.startsWith('bcrypt')) {
              const match = await bcrypt.compare(testPassword, fullUser.password);
              if (match) {
                console.log(`   ✅ FOUND MATCH: "${testPassword}" works for ${testUser.email}!`);
              }
            }
          } catch (error) {
            // Silent error for invalid format
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAllPasswords();
