import { readFileSync, writeFileSync } from 'fs';

function fixGuardLoggers() {
  console.log('🔧 Fixing guard logger issues...');
  
  const filesToFix = [
    './src/auth/guards/enhanced-organization-security.guard.ts',
    './src/auth/guards/organization-access.guard.ts',
    './src/auth/guards/user-verification.guard.ts',
    './src/auth/jwt-access-validation.service.ts',
    './src/auth/services/ultra-compact-access-validation.service.ts',
    './src/auth/services/ultra-compact-jwt.service.ts'
  ];

  for (const filePath of filesToFix) {
    try {
      let content = readFileSync(filePath, 'utf8');
      
      // Fix logger patterns that incorrectly reference class.firstName and class.lastName
      content = content.replace(
        /private readonly logger = new Logger\(`\$\{(\w+)\.firstName\} \$\{\\1\.lastName \|\| ''\}`\.trim\(\)\);/g,
        'private readonly logger = new Logger($1.name);'
      );
      
      // Also fix any remaining patterns
      content = content.replace(
        /new Logger\(`\$\{(\w+)\.firstName\} \$\{\\1\.lastName \|\| ''\}`\.trim\(\)\)/g,
        'new Logger($1.name)'
      );
      
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed logger in ${filePath}`);
    } catch (error) {
      console.log(`⚠️ Could not fix ${filePath}: ${error.message}`);
    }
  }

  console.log('✅ Guard logger fixes completed');
}

fixGuardLoggers();
