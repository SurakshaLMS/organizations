import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

console.log('🔧 UPDATING SERVICES TO USE SINGLE LAAS DATABASE');
console.log('===============================================');

interface UpdateSummary {
  totalFiles: number;
  syncServicesRemoved: string[];
  dualConnectionsFixed: string[];
  userTypeReferencesRemoved: string[];
  errors: string[];
}

const summary: UpdateSummary = {
  totalFiles: 0,
  syncServicesRemoved: [],
  dualConnectionsFixed: [],
  userTypeReferencesRemoved: [],
  errors: []
};

async function updateFile(filePath: string, patterns: { search: string; replace: string; description: string }[]): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    for (const pattern of patterns) {
      if (content.includes(pattern.search)) {
        content = content.replace(new RegExp(pattern.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), pattern.replace);
        console.log(`   ✅ ${pattern.description}`);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    summary.errors.push(`${filePath}: ${error.message}`);
    return false;
  }
}

async function findAndUpdateFiles() {
  const serviceDirs = [
    'src/auth',
    'src/organization', 
    'src/institute',
    'src/lecture',
    'src/cause',
    'src/sync',
    'src/jobs',
    'src/prisma'
  ];

  console.log('1️⃣ Updating PrismaService to remove dual connections...');
  
  // Update PrismaService
  const prismaServicePath = 'src/prisma/prisma.service.ts';
  const prismaUpdated = await updateFile(prismaServicePath, [
    {
      search: 'this.laasClient = new PrismaClient',
      replace: '// Removed: Single database approach using main client',
      description: 'Removed LaaS client initialization'
    },
    {
      search: 'laasClient: PrismaClient',
      replace: '// Removed: laasClient property',
      description: 'Removed laasClient property declaration'
    },
    {
      search: 'private laasClient',
      replace: '// Removed: private laasClient',
      description: 'Removed private laasClient declaration'
    },
    {
      search: 'await this.laasClient.$disconnect()',
      replace: '// Removed: LaaS client disconnect',
      description: 'Removed laasClient disconnect'
    }
  ]);

  if (prismaUpdated) {
    summary.dualConnectionsFixed.push(prismaServicePath);
  }

  console.log('2️⃣ Removing sync service and job references...');
  
  // Remove sync service files
  const syncFiles = [
    'src/sync/sync.service.ts',
    'src/sync/sync.controller.ts', 
    'src/sync/sync.module.ts',
    'src/jobs/user-sync.service.ts'
  ];

  for (const syncFile of syncFiles) {
    if (fs.existsSync(syncFile)) {
      try {
        fs.unlinkSync(syncFile);
        console.log(`   ✅ Deleted ${syncFile}`);
        summary.syncServicesRemoved.push(syncFile);
      } catch (error) {
        console.log(`   ⚠️ Could not delete ${syncFile}: ${error.message}`);
      }
    }
  }

  console.log('3️⃣ Updating service files to remove UserType references...');

  for (const dir of serviceDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file as string);
        
        if (filePath.includes('.service.ts') && fs.statSync(filePath).isFile()) {
          summary.totalFiles++;
          
          const userTypeUpdated = await updateFile(filePath, [
            {
              search: 'UserType.',
              replace: '// Removed: UserType enum reference',
              description: 'Removed UserType enum usage'
            },
            {
              search: 'import.*UserType.*from',
              replace: '// Removed: UserType import',
              description: 'Removed UserType import'
            },
            {
              search: 'userType:',
              replace: '// Removed: userType field',
              description: 'Removed userType field references'
            },
            {
              search: 'user_type',
              replace: '// Removed: user_type field',
              description: 'Removed user_type field references'
            },
            {
              search: 'this.laasClient',
              replace: 'this.prisma',
              description: 'Replace laasClient with main prisma client'
            },
            {
              search: 'laasClient.',
              replace: 'prisma.',
              description: 'Replace laasClient calls with prisma calls'
            }
          ]);

          if (userTypeUpdated) {
            summary.userTypeReferencesRemoved.push(filePath);
          }
        }
      }
    }
  }

  console.log('4️⃣ Updating main application modules...');
  
  // Update app.module.ts
  const appModulePath = 'src/app.module.ts';
  if (fs.existsSync(appModulePath)) {
    await updateFile(appModulePath, [
      {
        search: 'SyncModule',
        replace: '// Removed: SyncModule',
        description: 'Removed SyncModule import/usage'
      },
      {
        search: 'UserSyncService',
        replace: '// Removed: UserSyncService',
        description: 'Removed UserSyncService import/usage'
      }
    ]);
  }

  console.log('5️⃣ Updating controller files...');
  
  const controllers = [
    'src/auth/auth.controller.ts',
    'src/organization/organization.controller.ts',
    'src/institute/institute-user.controller.ts',
    'src/lecture/lecture.controller.ts',
    'src/cause/cause.controller.ts'
  ];

  for (const controller of controllers) {
    if (fs.existsSync(controller)) {
      await updateFile(controller, [
        {
          search: 'UserType',
          replace: '// Removed: UserType',
          description: 'Removed UserType references from controller'
        },
        {
          search: 'user_type',
          replace: '// Removed: user_type',
          description: 'Removed user_type field references'
        }
      ]);
    }
  }
}

async function updateEnvironmentConfig() {
  console.log('6️⃣ Updating environment configuration...');
  
  // Update .env to remove organizations database URL
  const envPath = '.env';
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Comment out DATABASE_URL (organizations database)
    if (envContent.includes('DATABASE_URL=') && !envContent.includes('# DATABASE_URL=')) {
      envContent = envContent.replace(/^DATABASE_URL=/gm, '# DATABASE_URL=');
      console.log('   ✅ Commented out DATABASE_URL (organizations database)');
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
  }
}

async function main() {
  try {
    await findAndUpdateFiles();
    await updateEnvironmentConfig();

    console.log('\n📊 UPDATE SUMMARY');
    console.log('=================');
    console.log(`Total files processed: ${summary.totalFiles}`);
    console.log(`Sync services removed: ${summary.syncServicesRemoved.length}`);
    console.log(`Dual connections fixed: ${summary.dualConnectionsFixed.length}`);
    console.log(`UserType references removed: ${summary.userTypeReferencesRemoved.length}`);
    
    if (summary.syncServicesRemoved.length > 0) {
      console.log('\n🗑️ Removed sync services:');
      summary.syncServicesRemoved.forEach(file => console.log(`   - ${file}`));
    }
    
    if (summary.dualConnectionsFixed.length > 0) {
      console.log('\n🔧 Fixed dual connections in:');
      summary.dualConnectionsFixed.forEach(file => console.log(`   - ${file}`));
    }
    
    if (summary.userTypeReferencesRemoved.length > 0) {
      console.log('\n✂️ Removed UserType references from:');
      summary.userTypeReferencesRemoved.forEach(file => console.log(`   - ${file}`));
    }

    if (summary.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      summary.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n✅ SERVICE UPDATE COMPLETED!');
    console.log('\n🎯 Next steps:');
    console.log('1. Test the application: npm run start:dev');
    console.log('2. Run API tests to verify functionality');
    console.log('3. Remove organizations database connection from deployment');
    console.log('4. Update documentation to reflect single-database architecture');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

main();
