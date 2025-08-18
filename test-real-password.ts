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

// Get values from .env
const BCRYPT_PEPPER = "4f8a7b2c9e1d6f3a8b5c9e2d7f1a4b8c5e9d2f6a3b7c0e4d8f1a5b9c2e6d9f3a";
const PASSWORD_ENCRYPTION_KEY = "4f8a7b2c9e1d6f3a8b5c9e2d7f1a4b8c5e9d2f6a3b7c0e4d8f1a5b9c2e6d9f3a";

async function testRealPassword() {
  try {
    console.log('🧪 Testing real password: Password123@');
    
    // Get the user that failed login
    const user = await prisma.user.findUnique({
      where: { email: 'ia@gmail.com' },
      select: {
        userId: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true
      }
    });

    if (!user) {
      console.log('❌ User ia@gmail.com not found');
      return;
    }

    console.log(`\n👤 User: ${user.email} (${user.firstName} ${user.lastName || ''})`);
    console.log(`🆔 ID: ${user.userId}`);
    console.log(`🔒 Password Hash: ${user.password}`);
    console.log(`📏 Length: ${user.password?.length}`);
    
    if (!user.password) {
      console.log('❌ User has no password set');
      return;
    }

    const testPassword = 'Password123@';
    console.log(`\n🧪 Testing with "${testPassword}":`);
    
    // Check format
    const isBcryptFormat = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
    const isEncryptedFormat = user.password.includes(':');
    
    console.log(`🔐 Is bcrypt format: ${isBcryptFormat}`);
    console.log(`🔐 Is encrypted format (has :): ${isEncryptedFormat}`);

    // Test 1: Direct bcrypt
    if (isBcryptFormat) {
      try {
        const directMatch = await bcrypt.compare(testPassword, user.password);
        console.log(`✅ Direct bcrypt: ${directMatch ? '✓ MATCH' : '✗ NO MATCH'}`);
      } catch (error) {
        console.log(`❌ Direct bcrypt error: ${error.message}`);
      }
    }

    // Test 2: Peppered password
    try {
      const pepperedPassword = createPepperedPassword(testPassword);
      console.log(`🌶️ Peppered password: ${pepperedPassword.substring(0, 50)}...`);
      
      if (isBcryptFormat) {
        const pepperedMatch = await bcrypt.compare(pepperedPassword, user.password);
        console.log(`✅ Peppered bcrypt: ${pepperedMatch ? '✓ MATCH' : '✗ NO MATCH'}`);
      }
    } catch (error) {
      console.log(`❌ Peppered error: ${error.message}`);
    }

    // Test 3: Decrypt then compare
    if (isEncryptedFormat) {
      try {
        const decrypted = decryptPassword(user.password);
        console.log(`🔓 Decrypted: ${decrypted ? 'SUCCESS' : 'FAILED'}`);
        
        if (decrypted) {
          console.log(`📝 Decrypted value: ${decrypted.substring(0, 30)}...`);
          
          // Direct comparison
          const plaintextMatch = decrypted === testPassword;
          console.log(`✅ Plain comparison: ${plaintextMatch ? '✓ MATCH' : '✗ NO MATCH'}`);
          
          // If decrypted looks like bcrypt, test it
          if (decrypted.startsWith('$2a$') || decrypted.startsWith('$2b$')) {
            const bcryptMatch = await bcrypt.compare(testPassword, decrypted);
            console.log(`✅ Bcrypt on decrypted: ${bcryptMatch ? '✓ MATCH' : '✗ NO MATCH'}`);
            
            // Also test peppered on decrypted bcrypt
            const pepperedPassword = createPepperedPassword(testPassword);
            const pepperedDecryptMatch = await bcrypt.compare(pepperedPassword, decrypted);
            console.log(`✅ Peppered on decrypted: ${pepperedDecryptMatch ? '✓ MATCH' : '✗ NO MATCH'}`);
          }
        }
      } catch (error) {
        console.log(`❌ Decrypt error: ${error.message}`);
      }
    }

    // Test 4: Hash the test password and compare structure
    console.log('\n🔨 Testing password hashing methods:');
    
    // Hash with current settings
    const directBcrypt = await bcrypt.hash(testPassword, 12);
    console.log(`📦 Direct bcrypt of test password: ${directBcrypt}`);
    
    const pepperedBcrypt = await bcrypt.hash(createPepperedPassword(testPassword), 12);
    console.log(`📦 Peppered bcrypt of test password: ${pepperedBcrypt.substring(0, 50)}...`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function decryptPassword(encryptedData: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(PASSWORD_ENCRYPTION_KEY.slice(0, 32)), iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    return null;
  }
}

function createPepperedPassword(password: string): string {
  return crypto
    .createHmac('sha256', BCRYPT_PEPPER)
    .update(password)
    .digest('hex') + password;
}

testRealPassword();
