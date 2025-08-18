import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixNameFields() {
  const srcDir = './src';
  const testFiles = ['check-data.ts', 'check-users.ts', 'ensure-test-user.ts', 'test-controller.ts', 'test-user-lookup.ts'];
  
  // Get all TypeScript files
  const allFiles = [
    ...getAllTsFiles(srcDir),
    ...testFiles.map(f => `./${f}`)
  ];
  
  let totalReplacements = 0;
  
  for (const filePath of allFiles) {
    try {
      let content = readFileSync(filePath, 'utf8');
      let replacements = 0;
      
      // Replace user.name with firstName + lastName pattern
      const nameRegex = /(\w+)\.name(?!\s*:)/g; // Match user.name but not name: true
      const matches = content.match(nameRegex);
      
      if (matches) {
        content = content.replace(nameRegex, (match, userVar) => {
          replacements++;
          return `\`\${${userVar}.firstName} \${${userVar}.lastName || ''}\`.trim()`;
        });
      }
      
      // Replace name: true with firstName: true, lastName: true
      const selectNameRegex = /name:\s*true,?/g;
      if (content.includes('name: true')) {
        content = content.replace(selectNameRegex, 'firstName: true, lastName: true,');
        replacements++;
      }
      
      // Replace role: true with status: true
      if (content.includes('role: true')) {
        content = content.replace(/role:\s*true,?/g, 'status: true,');
        replacements++;
      }
      
      if (replacements > 0) {
        writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed ${replacements} issues in ${filePath}`);
        totalReplacements += replacements;
      }
    } catch (error) {
      console.log(`⚠️  Could not process ${filePath}: ${error.message}`);
    }
  }
  
  console.log(`\n🎉 Total replacements: ${totalReplacements}`);
}

fixNameFields();
