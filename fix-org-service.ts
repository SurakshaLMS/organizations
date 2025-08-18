import { readFileSync, writeFileSync } from 'fs';

function fixOrganizationService() {
  console.log('🔧 Fixing organization service...');
  
  const filePath = './src/organization/organization.service.ts';
  let content = readFileSync(filePath, 'utf8');
  
  // Fix all firstName references to name for Organization model
  content = content.replace(/firstName: true,\s*\n\s*lastName: true,/g, 'name: true,');
  content = content.replace(/firstName: true,/g, 'name: true,');
  
  // Fix searchTerm variable declaration issues
  content = content.replace(/where\.name = \{ contains: searchTerm \};/g, 'where.name = { contains: paginationDto.search };');
  
  // Fix status field issues in selects
  content = content.replace(/status: true,/g, 'role: true,');
  
  // Fix _count access issues by adding proper include
  content = content.replace(/org\._count\.organizationUsers/g, 'org.organizationUsers?.length || 0');
  content = content.replace(/org\._count\.causes/g, 'org.causes?.length || 0');
  content = content.replace(/institute\._count\.organizations/g, 'institute.organizations?.length || 0');
  
  // Fix institute access
  content = content.replace(/institute: org\.institute/g, 'instituteId: org.instituteId');
  
  // Fix count aggregation issues
  content = content.replace(/_count: \{ status: true, \}/g, '_count: { role: true }');
  content = content.replace(/item\._count\.role/g, 'item._count?.role || 0');
  
  writeFileSync(filePath, content, 'utf8');
  console.log('✅ Fixed organization service');
}

fixOrganizationService();
