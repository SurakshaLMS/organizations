import { readFileSync, writeFileSync } from 'fs';

function fixUserModelFields() {
  console.log('🔧 Fixing User model field access...');
  
  const filePath = './src/organization/organization.service.ts';
  let content = readFileSync(filePath, 'utf8');
  
  // Fix User model references - User has firstName/lastName, not name
  content = content.replace(/user:\s*\{\s*select:\s*\{\s*userId:\s*true,\s*name:\s*true,/g, 'user: {\n          select: {\n            userId: true,\n            firstName: true,\n            lastName: true,');
  
  // Fix paginationDto undefined issue
  content = content.replace(/paginationDto\.search/g, 'paginationDto?.search');
  
  // Fix verifier field access
  content = content.replace(/verifier:\s*\{\s*select:\s*\{\s*userId:\s*true,\s*name:\s*true,/g, 'verifier: {\n            select: {\n              userId: true,\n              firstName: true,\n              lastName: true,');
  
  // Fix any remaining User name references
  content = content.replace(/select:\s*\{\s*userId:\s*true,\s*name:\s*true,\s*email:\s*true,\s*\}/g, 'select: {\n              userId: true,\n              firstName: true,\n              lastName: true,\n              email: true,\n            }');
  
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed User model field access');
}

fixUserModelFields();
