import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixLoggerIssues() {
  console.log('🔧 Fixing logger and field issues...');
  
  // Fix all logger statements to use .name instead of firstName/lastName
  const filesToFixLoggers = [
    './src/auth/auth.service.ts',
    './src/auth/auth.service.clean.ts',
    './src/auth/guards/enhanced-organization-security.guard.ts',
    './src/auth/guards/organization-access.guard.ts',
    './src/auth/guards/roles.guard.ts',
    './src/auth/guards/user-verification.guard.ts',
    './src/auth/jwt-access-validation.service.ts',
    './src/auth/services/ultra-compact-access-validation.service.ts',
    './src/auth/services/ultra-compact-jwt.service.ts',
    './src/common/interceptors/audit-log.interceptor.ts',
    './src/lecture/lecture.controller.clean.ts',
    './src/lecture/lecture.controller.ts',
    './src/lecture/lecture.service.ts',
    './src/organization/organization.service.ts'
  ];

  for (const filePath of filesToFixLoggers) {
    try {
      let content = readFileSync(filePath, 'utf8');
      
      // Fix logger statements - replace Class.firstName Class.lastName patterns with Class.name
      content = content.replace(/`\$\{(\w+)\.firstName\} \$\{\\1\.lastName \|\| ''\}`.trim\(\)/g, '$1.name');
      
      // Fix any remaining firstName/lastName in loggers
      const regex = /new Logger\(`\$\{(\w+)\.firstName\} \$\{\\1\.lastName \|\| ''\}`.trim\(\)\)/g;
      content = content.replace(regex, 'new Logger($1.name)');
      
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed logger in ${filePath}`);
    } catch (error) {
      console.log(`⚠️ Could not fix ${filePath}: ${error.message}`);
    }
  }

  console.log('✅ Logger fixes completed');
}

fixLoggerIssues();
