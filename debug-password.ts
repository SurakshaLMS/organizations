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

async function debugPassword() {
  try {
    console.log('🔍 Debug Password Format from LaaS Database');
    
    // Get a sample user with password
    const users = await prisma.user.findMany({
      where: {
        password: {
          not: null
        }
      },
      select: {
        userId: true,
        email: true,
        password: true
      },
      take: 3
    });

    console.log(`📊 Found ${users.length} users with passwords`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`🆔 ID: ${user.userId}`);
      console.log(`🔒 Password Hash: ${user.password?.substring(0, 50)}...`);
      console.log(`📏 Length: ${user.password?.length}`);
      
      if (user.password) {
        // Check if it's bcrypt format
        const isBcryptFormat = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        console.log(`🔐 Is bcrypt format: ${isBcryptFormat}`);
        
        // Check if it's encrypted format (has colon)
        const isEncryptedFormat = user.password.includes(':');
        console.log(`🔐 Is encrypted format (has :): ${isEncryptedFormat}`);
        
        // Try to decrypt if it looks encrypted
        if (isEncryptedFormat) {
          try {
            const decrypted = decryptPassword(user.password);
            console.log(`🔓 Decrypted: ${decrypted ? 'SUCCESS' : 'FAILED'}`);
            if (decrypted) {
              console.log(`📝 Decrypted value: ${decrypted.substring(0, 20)}...`);
            }
          } catch (error) {
            console.log(`❌ Decryption error: ${error.message}`);
          }
        }
        
        // Test with a common password
        const testPassword = 'password123';
        console.log(`🧪 Testing with "${testPassword}":`);
        
        // Try direct bcrypt
        if (isBcryptFormat) {
          try {
            const directMatch = await bcrypt.compare(testPassword, user.password);
            console.log(`   Direct bcrypt: ${directMatch ? 'MATCH' : 'NO MATCH'}`);
          } catch (error) {
            console.log(`   Direct bcrypt error: ${error.message}`);
          }
        }
        
        // Try peppered
        try {
          const pepperedPassword = createPepperedPassword(testPassword);
          if (isBcryptFormat) {
            const pepperedMatch = await bcrypt.compare(pepperedPassword, user.password);
            console.log(`   Peppered bcrypt: ${pepperedMatch ? 'MATCH' : 'NO MATCH'}`);
          }
        } catch (error) {
          console.log(`   Peppered error: ${error.message}`);
        }
        
        // Try decrypt then compare
        if (isEncryptedFormat) {
          try {
            const decrypted = decryptPassword(user.password);
            if (decrypted) {
              const plaintextMatch = decrypted === testPassword;
              console.log(`   Decrypt compare: ${plaintextMatch ? 'MATCH' : 'NO MATCH'}`);
              
              // If decrypted value looks like bcrypt hash, try bcrypt
              if (decrypted.startsWith('$2a$') || decrypted.startsWith('$2b$')) {
                const bcryptOnDecrypted = await bcrypt.compare(testPassword, decrypted);
                console.log(`   Bcrypt on decrypted: ${bcryptOnDecrypted ? 'MATCH' : 'NO MATCH'}`);
              }
            }
          } catch (error) {
            console.log(`   Decrypt compare error: ${error.message}`);
          }
        }
      }
      
      console.log('─'.repeat(80));
    }
    
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

debugPassword();
