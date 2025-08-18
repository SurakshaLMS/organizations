import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixFieldAccessIssues() {
  console.log('🔧 Fixing field access issues...');
  
  // Fix all field access patterns
  const filesToFix = [
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

  for (const filePath of filesToFix) {
    try {
      let content = readFileSync(filePath, 'utf8');
      let modified = false;
      
      // Fix organization field access patterns
      if (content.includes('organization.firstName') || content.includes('organization.lastName')) {
        content = content.replace(/organization\.firstName/g, 'organization.name');
        content = content.replace(/organization\.lastName/g, '""'); // Empty string for lastName
        modified = true;
      }
      
      // Fix org field access patterns  
      if (content.includes('org.firstName') || content.includes('org.lastName')) {
        content = content.replace(/org\.firstName/g, 'org.name');
        content = content.replace(/org\.lastName/g, '""'); // Empty string for lastName
        modified = true;
      }
      
      // Fix owner field access patterns
      if (content.includes('owner.firstName') || content.includes('owner.lastName')) {
        // Keep owner as is since it's typically a User
        // But fix any mistaken organization.owner accesses
        content = content.replace(/organization\.owner\.firstName/g, 'organization.owner?.firstName');
        content = content.replace(/organization\.owner\.lastName/g, 'organization.owner?.lastName');
        modified = true;
      }
      
      // Fix any remaining firstName/lastName patterns on Organization model
      const orgFirstNamePattern = /(\w+)\.firstName.*?where.*?Organization/gs;
      if (orgFirstNamePattern.test(content)) {
        content = content.replace(orgFirstNamePattern, (match) => {
          return match.replace(/\.firstName/g, '.name');
        });
        modified = true;
      }
      
      // Fix string concatenations
      content = content.replace(/`\$\{(\w+)\.firstName\} \$\{\\1\.lastName \|\| ''\}`\.trim\(\)/g, '$1.name');
      content = content.replace(/(\w+)\.firstName \+ ' ' \+ \1\.lastName/g, '$1.name');
      
      if (modified) {
        writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed field access in ${filePath}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not fix ${filePath}: ${error.message}`);
    }
  }

  console.log('✅ Field access fixes completed');
}

fixFieldAccessIssues();
