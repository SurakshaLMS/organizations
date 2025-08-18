// Check current LaaS database structure and plan migration
import * as mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv();

async function analyzeLaaSForMigration() {
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
    
    console.log('🔍 ANALYZING LAAS DATABASE FOR MIGRATION');
    console.log('='.repeat(60));
    
    // Check existing tables
    const [tables] = await connection.execute('SHOW TABLES');
    const existingTables = (tables as any[]).map(row => Object.values(row)[0]);
    
    console.log('\n📋 Existing tables in LaaS:');
    existingTables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });
    
    // Check if our required tables exist
    const requiredTables = [
      'users', 'institutes', 'institute_user', // Keep these unchanged
      'organizations', 'organization_users', 'causes', 'lectures', 
      'assignments', 'documentation'
    ];
    
    console.log('\n🎯 TABLE EXISTENCE CHECK:');
    console.log('='.repeat(40));
    
    for (const table of requiredTables) {
      const exists = existingTables.includes(table);
      if (exists) {
        // Get record count
        try {
          const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`✅ ${table}: EXISTS (${(count as any[])[0].count} records)`);
        } catch {
          console.log(`✅ ${table}: EXISTS (cannot count)`);
        }
      } else {
        console.log(`❌ ${table}: MISSING - needs to be created`);
      }
    }
    
    // Analyze institute_user table structure
    console.log('\n🎓 INSTITUTE_USER TABLE ANALYSIS:');
    console.log('='.repeat(40));
    
    const [instituteUserColumns] = await connection.execute('DESCRIBE institute_user');
    console.log('Current columns:');
    (instituteUserColumns as any[]).forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });
    
    // Check sample data to understand the structure
    const [sampleInstituteUsers] = await connection.execute(`
      SELECT iu.*, u.user_type 
      FROM institute_user iu
      INNER JOIN users u ON iu.user_id = u.id
      LIMIT 3
    `);
    
    console.log('\nSample institute_user data with user types from users table:');
    (sampleInstituteUsers as any[]).forEach((record, index) => {
      console.log(`${index + 1}. Institute: ${record.institute_id}, User: ${record.user_id}`);
      console.log(`   Status: ${record.status}, User Type: ${record.user_type}`);
      console.log(`   Institute User ID: ${record.user_id_institue || 'N/A'}`);
    });
    
    console.log('\n✅ Analysis completed!');
    console.log('\n📋 MIGRATION PLAN:');
    console.log('='.repeat(40));
    console.log('1. Keep users, institutes, institute_user tables unchanged');
    console.log('2. Create missing tables: organizations, causes, lectures, assignments, documentation');
    console.log('3. Update Prisma schema to use LaaS database');
    console.log('4. Remove user_type from institute_user relations (get from users table)');
    console.log('5. Update all services to use single LaaS database');
    
  } catch (error) {
    console.error('❌ Error analyzing LaaS database:', error);
    throw error;
  } finally {
    if (connection!) {
      await connection.end();
    }
  }
}

analyzeLaaSForMigration().catch(console.error);
