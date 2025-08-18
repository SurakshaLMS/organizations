// Check LaaS Organizations Table Structure
import * as mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv();

async function checkLaaSOrganizations() {
  let connection: mysql.Connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'laas',
      timezone: '+00:00',
    });
    
    console.log('🏢 ANALYZING LAAS ORGANIZATIONS TABLE');
    console.log('='.repeat(60));
    
    // Check organizations table structure
    try {
      const [orgColumns] = await connection.execute('DESCRIBE organizations');
      console.log('\n📋 Organizations table columns:');
      (orgColumns as any[]).forEach((col, index) => {
        console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
      });
      
      // Get count
      const [orgCount] = await connection.execute('SELECT COUNT(*) as count FROM organizations');
      console.log(`\n📊 Total organizations: ${(orgCount as any[])[0].count}`);
      
      // Get active count if there's an is_active field
      try {
        const [activeCount] = await connection.execute('SELECT COUNT(*) as count FROM organizations WHERE is_active = 1');
        console.log(`📊 Active organizations: ${(activeCount as any[])[0].count}`);
      } catch {
        console.log('📊 No is_active field found');
      }
      
      // Sample data
      const [sampleOrgs] = await connection.execute(`
        SELECT * FROM organizations 
        ORDER BY id DESC 
        LIMIT 5
      `);
      console.log('\n📄 Sample organizations data:');
      (sampleOrgs as any[]).forEach((org, index) => {
        console.log(`\n${index + 1}. Organization ID: ${org.id}`);
        Object.keys(org).forEach(key => {
          if (key !== 'id') {
            console.log(`   ${key}: ${org[key] || 'NULL'}`);
          }
        });
      });
      
    } catch (error) {
      console.log('❌ Organizations table not found or inaccessible');
    }
    
    // Check organization_users table
    console.log('\n\n👥 ANALYZING LAAS ORGANIZATION_USERS TABLE');
    console.log('='.repeat(60));
    
    try {
      const [orgUserColumns] = await connection.execute('DESCRIBE organization_users');
      console.log('\n📋 Organization_users table columns:');
      (orgUserColumns as any[]).forEach((col, index) => {
        console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
      });
      
      // Get count
      const [orgUserCount] = await connection.execute('SELECT COUNT(*) as count FROM organization_users');
      console.log(`\n📊 Total organization-user relationships: ${(orgUserCount as any[])[0].count}`);
      
      // Sample data with joins
      const [sampleOrgUsers] = await connection.execute(`
        SELECT ou.*, o.name as org_name, u.first_name, u.last_name, u.email
        FROM organization_users ou
        LEFT JOIN organizations o ON ou.organization_id = o.id
        LEFT JOIN users u ON ou.user_id = u.id
        LIMIT 5
      `);
      console.log('\n📄 Sample organization-user relationships:');
      (sampleOrgUsers as any[]).forEach((rel, index) => {
        console.log(`\n${index + 1}. Relationship ID: ${rel.id || 'N/A'}`);
        console.log(`   Organization: ${rel.org_name || 'Unknown'} (ID: ${rel.organization_id})`);
        console.log(`   User: ${rel.first_name} ${rel.last_name} (${rel.email}) (ID: ${rel.user_id})`);
        Object.keys(rel).forEach(key => {
          if (!['id', 'organization_id', 'user_id', 'org_name', 'first_name', 'last_name', 'email'].includes(key)) {
            console.log(`   ${key}: ${rel[key] || 'NULL'}`);
          }
        });
      });
      
    } catch (error) {
      console.log('❌ Organization_users table not found or inaccessible');
    }
    
    // Check organization_managers table
    console.log('\n\n👔 ANALYZING LAAS ORGANIZATION_MANAGERS TABLE');
    console.log('='.repeat(60));
    
    try {
      const [orgManagerColumns] = await connection.execute('DESCRIBE organization_managers');
      console.log('\n📋 Organization_managers table columns:');
      (orgManagerColumns as any[]).forEach((col, index) => {
        console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
      });
      
      // Get count
      const [orgManagerCount] = await connection.execute('SELECT COUNT(*) as count FROM organization_managers');
      console.log(`\n📊 Total organization managers: ${(orgManagerCount as any[])[0].count}`);
      
      // Sample data with joins
      const [sampleOrgManagers] = await connection.execute(`
        SELECT om.*, o.name as org_name, u.first_name, u.last_name, u.email
        FROM organization_managers om
        LEFT JOIN organizations o ON om.organization_id = o.id
        LEFT JOIN users u ON om.user_id = u.id
        LIMIT 5
      `);
      console.log('\n📄 Sample organization managers:');
      (sampleOrgManagers as any[]).forEach((mgr, index) => {
        console.log(`\n${index + 1}. Manager ID: ${mgr.id || 'N/A'}`);
        console.log(`   Organization: ${mgr.org_name || 'Unknown'} (ID: ${mgr.organization_id})`);
        console.log(`   Manager: ${mgr.first_name} ${mgr.last_name} (${mgr.email}) (ID: ${mgr.user_id})`);
        Object.keys(mgr).forEach(key => {
          if (!['id', 'organization_id', 'user_id', 'org_name', 'first_name', 'last_name', 'email'].includes(key)) {
            console.log(`   ${key}: ${mgr[key] || 'NULL'}`);
          }
        });
      });
      
    } catch (error) {
      console.log('❌ Organization_managers table not found or inaccessible');
    }
    
    // Check organization_students table  
    console.log('\n\n🎓 ANALYZING LAAS ORGANIZATION_STUDENTS TABLE');
    console.log('='.repeat(60));
    
    try {
      const [orgStudentColumns] = await connection.execute('DESCRIBE organization_students');
      console.log('\n📋 Organization_students table columns:');
      (orgStudentColumns as any[]).forEach((col, index) => {
        console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
      });
      
      // Get count
      const [orgStudentCount] = await connection.execute('SELECT COUNT(*) as count FROM organization_students');
      console.log(`\n📊 Total organization students: ${(orgStudentCount as any[])[0].count}`);
      
    } catch (error) {
      console.log('❌ Organization_students table not found or inaccessible');
    }
    
    console.log('\n✅ LaaS Organizations analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing LaaS organizations:', error);
    throw error;
  } finally {
    if (connection!) {
      await connection.end();
    }
  }
}

checkLaaSOrganizations().catch(console.error);
