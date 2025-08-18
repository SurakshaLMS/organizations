import { readFileSync, writeFileSync } from 'fs';

function fixModelFieldIssues() {
  console.log('🔧 Fixing model field issues...');
  
  // Fix organization.service.ts - Organization model has 'name' field, not firstName/lastName
  console.log('Fixing organization.service.ts model field issues...');
  const orgServicePath = './src/organization/organization.service.ts';
  let orgService = readFileSync(orgServicePath, 'utf8');
  
  // Replace all organization.firstName/lastName with organization.name
  orgService = orgService.replace(/`\${organization\.firstName} \${organization\.lastName \|\| ''}`.trim\(\)/g, 'organization.name');
  orgService = orgService.replace(/`\${org\.firstName} \${org\.lastName \|\| ''}`.trim\(\)/g, 'org.name');
  orgService = orgService.replace(/`\${updatedOrganization\.firstName} \${updatedOrganization\.lastName \|\| ''}`.trim\(\)/g, 'updatedOrganization.name');
  
  // Fix institute name access
  orgService = orgService.replace(/`\${institute\.firstName} \${institute\.lastName \|\| ''}`.trim\(\)/g, 'institute.name');
  
  // Remove invalid firstName/lastName from Organization selects
  orgService = orgService.replace(/firstName: true, lastName: true,/g, 'name: true,');
  
  // Fix where clauses that got broken
  orgService = orgService.replace(/`\${where\.firstName} \${where\.lastName \|\| ''}`.trim\(\) = `\${searchCondition\.firstName} \${searchCondition\.lastName \|\| ''}`.trim\(\);/g, 'where.name = { contains: searchTerm };');
  orgService = orgService.replace(/`\${where\.firstName} \${where\.lastName \|\| ''}`.trim\(\) = {/g, 'where.name = {');
  orgService = orgService.replace(/`\${updateData\.firstName} \${updateData\.lastName \|\| ''}`.trim\(\) = name;/g, 'updateData.name = name;');
  
  // Add missing includes for _count
  orgService = orgService.replace(/select: {\s*name: true,/g, `select: {
        name: true,
        _count: {
          select: {
            organizationUsers: true,
            causes: true,
          }
        },`);
  
  // Fix member access in organization list
  orgService = orgService.replace(/member\.`\${user\.firstName} \${user\.lastName \|\| ''}`.trim\(\)/g, 'user.name');
  
  writeFileSync(orgServicePath, orgService, 'utf8');
  console.log('✅ Fixed organization.service.ts');
  
  // Fix cause.service.ts
  console.log('Fixing cause.service.ts...');
  const causeServicePath = './src/cause/cause.service.ts';
  let causeService = readFileSync(causeServicePath, 'utf8');
  causeService = causeService.replace(/firstName: true, lastName: true,/g, 'name: true,');
  writeFileSync(causeServicePath, causeService, 'utf8');
  console.log('✅ Fixed cause.service.ts');
  
  // Fix organization-access.service.ts
  console.log('Fixing organization-access.service.ts...');
  const orgAccessPath = './src/auth/organization-access.service.ts';
  let orgAccess = readFileSync(orgAccessPath, 'utf8');
  
  // Fix status field selection (doesn't exist in OrganizationUser)
  orgAccess = orgAccess.replace(/status: true,/g, 'role: true, isVerified: true,');
  
  // Fix organization name access
  orgAccess = orgAccess.replace(/firstName: true, lastName: true,/g, 'name: true,');
  orgAccess = orgAccess.replace(/`\${organization\.firstName} \${organization\.lastName \|\| ''}`.trim\(\)/g, 'organization.name');
  
  writeFileSync(orgAccessPath, orgAccess, 'utf8');
  console.log('✅ Fixed organization-access.service.ts');
  
  // Fix institute-user.service.ts
  console.log('Fixing institute-user.service.ts...');
  const instUserPath = './src/institute/institute-user.service.ts';
  let instUser = readFileSync(instUserPath, 'utf8');
  
  // Fix Institute name access (Institute has name field, not firstName/lastName)
  instUser = instUser.replace(/firstName: true, lastName: true,/g, 'name: true,');
  instUser = instUser.replace(/isActive: true,/g, 'status: true,');
  
  writeFileSync(instUserPath, instUser, 'utf8');
  console.log('✅ Fixed institute-user.service.ts');
  
  // Fix test files
  console.log('Fixing test files...');
  const testFiles = [
    './test-controller.ts'
  ];
  
  for (const filePath of testFiles) {
    try {
      let content = readFileSync(filePath, 'utf8');
      
      // Fix organization field access
      content = content.replace(/firstName: true, lastName: true,/g, 'name: true,');
      content = content.replace(/status: true,/g, 'role: true, isVerified: true,');
      content = content.replace(/ou\.`\${organization\.firstName} \${organization\.lastName \|\| ''}`.trim\(\)/g, 'ou.organization.name');
      content = content.replace(/org\.organizationUsers/g, 'org.organizationUsers');
      
      // Add missing includes
      if (content.includes('organizationUsers: {')) {
        content = content.replace(/organizationUsers: {/g, `organizationUsers: {
          include: {
            organization: {
              select: { name: true, type: true }
            }
          },`);
      }
      
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${filePath}`);
    } catch (error) {
      console.log(`⚠️ Could not fix ${filePath}: ${error.message}`);
    }
  }
  
  console.log('✅ Model field fixes completed');
}

fixModelFieldIssues();
