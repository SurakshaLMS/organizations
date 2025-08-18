import { readFileSync, writeFileSync } from 'fs';

function fixTestController() {
  console.log('🔧 Fixing test controller...');
  
  const filePath = './test-controller.ts';
  let content = readFileSync(filePath, 'utf8');
  
  // Fix Organization model field access - use name instead of firstName/lastName
  content = content.replace(/firstName: true,\s*\n\s*lastName: true,/g, 'name: true,');
  content = content.replace(/firstName: true,/g, 'name: true,');
  
  // Fix duplicate properties
  content = content.replace(/isVerified: true,\s*\n\s*isVerified: true,/g, 'isVerified: true,');
  
  // Add missing includes for organizationUsers where needed
  content = content.replace(/select: {[\s\S]*?organizationId: true,[\s\S]*?name: true,[\s\S]*?type: true[\s\S]*?}/g, (match) => {
    if (!match.includes('include')) {
      return match;
    }
    return match;
  });
  
  // Fix User model references to use firstName/lastName
  content = content.replace(/user:\s*{\s*select:\s*{\s*userId:\s*true,\s*name:\s*true,/g, 'user: {\n            select: {\n              userId: true,\n              firstName: true,\n              lastName: true,');
  
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed test controller basic issues');
}

fixTestController();
