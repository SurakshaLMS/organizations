// Check LaaS Database Tables and Structure
import * as mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv();

async function checkLaaSDatabase() {
  let connection: mysql.Connection;
  
  try {
    // Connect to LaaS database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'laas', // Source LaaS database
      timezone: '+00:00',
    });
    
    console.log('🔍 Analyzing LaaS database structure...\n');
    
    // Show all tables
    console.log('📋 All tables in LaaS database:');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = (tables as any[]).map(row => Object.values(row)[0]);
    tableNames.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });
    console.log(`\n✅ Total tables found: ${tableNames.length}\n`);
    
    // Check users table structure with sample data
    console.log('👥 USERS TABLE ANALYSIS:');
    console.log('='.repeat(50));
    
    const [userColumns] = await connection.execute('DESCRIBE users');
    console.log('📋 Users table columns:');
    (userColumns as any[]).forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
    });
    
    const [usersCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    console.log(`\n📊 Active users count: ${(usersCount as any[])[0].count}`);
    
    // Sample user data
    const [sampleUsers] = await connection.execute(`
      SELECT id, first_name, last_name, email, user_type, phone_number, 
             date_of_birth, gender, nic, address_line1, city, district, 
             province, country, image_url, subscription_plan, payment_expires_at,
             created_at, updated_at
      FROM users 
      WHERE is_active = 1 
      LIMIT 5
    `);
    console.log('\n📄 Sample user data:');
    (sampleUsers as any[]).forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Email: ${user.email}`);
      console.log(`   Type: ${user.user_type}, Phone: ${user.phone_number || 'N/A'}`);
      console.log(`   DOB: ${user.date_of_birth || 'N/A'}, Gender: ${user.gender || 'N/A'}`);
      console.log(`   NIC: ${user.nic || 'N/A'}, Address: ${user.address_line1 || 'N/A'}`);
      console.log(`   Location: ${user.city || 'N/A'}, ${user.district || 'N/A'}, ${user.province || 'N/A'}`);
      console.log(`   Image: ${user.image_url || 'N/A'}, Subscription: ${user.subscription_plan}`);
      console.log(`   Payment Expires: ${user.payment_expires_at || 'N/A'}`);
      console.log('');
    });
    
    // Check institutes table
    console.log('\n🏛️ INSTITUTES TABLE ANALYSIS:');
    console.log('='.repeat(50));
    
    const [instituteColumns] = await connection.execute('DESCRIBE institutes');
    console.log('📋 Institutes table columns:');
    (instituteColumns as any[]).forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
    });
    
    const [institutesCount] = await connection.execute('SELECT COUNT(*) as count FROM institutes WHERE is_active = 1');
    console.log(`\n📊 Active institutes count: ${(institutesCount as any[])[0].count}`);
    
    // Sample institute data
    const [sampleInstitutes] = await connection.execute(`
      SELECT id, name, code, email, phone, address, city, state, country, 
             pin_code, type, imageUrl, created_at, updated_at
      FROM institutes 
      WHERE is_active = 1 
      LIMIT 3
    `);
    console.log('\n📄 Sample institute data:');
    (sampleInstitutes as any[]).forEach((institute, index) => {
      console.log(`${index + 1}. ID: ${institute.id}, Name: ${institute.name}`);
      console.log(`   Code: ${institute.code || 'N/A'}, Email: ${institute.email || 'N/A'}`);
      console.log(`   Phone: ${institute.phone || 'N/A'}, Type: ${institute.type || 'N/A'}`);
      console.log(`   Address: ${institute.address || 'N/A'}, ${institute.city || 'N/A'}`);
      console.log(`   State: ${institute.state || 'N/A'}, Country: ${institute.country || 'N/A'}`);
      console.log(`   Image: ${institute.imageUrl || 'N/A'}`);
      console.log('');
    });
    
    // Check institute_user table
    console.log('\n🎓 INSTITUTE_USER TABLE ANALYSIS:');
    console.log('='.repeat(50));
    
    const [instituteUserColumns] = await connection.execute('DESCRIBE institute_user');
    console.log('📋 Institute_user table columns:');
    (instituteUserColumns as any[]).forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'Nullable' : 'Required'}${col.Key ? ` [${col.Key}]` : ''}${col.Default ? ` Default: ${col.Default}` : ''}`);
    });
    
    const [instituteUsersCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM institute_user iu
      INNER JOIN institutes i ON iu.institute_id = i.id
      INNER JOIN users u ON iu.user_id = u.id
      WHERE i.is_active = 1 AND u.is_active = 1
    `);
    console.log(`\n📊 Active institute-user relationships: ${(instituteUsersCount as any[])[0].count}`);
    
    // Check user types distribution
    const [statusDistribution] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM institute_user 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\n📊 Institute user status distribution:');
    (statusDistribution as any[]).forEach(status => {
      console.log(`   ${status.status}: ${status.count} relationships`);
    });
    
    // Sample institute_user data
    const [sampleInstituteUsers] = await connection.execute(`
      SELECT iu.institute_id, iu.user_id, iu.status, iu.user_id_institue,
             i.name as institute_name, u.first_name, u.last_name, u.user_type,
             iu.verified_by, iu.verified_at, iu.created_at
      FROM institute_user iu
      INNER JOIN institutes i ON iu.institute_id = i.id
      INNER JOIN users u ON iu.user_id = u.id
      WHERE i.is_active = 1 AND u.is_active = 1
      LIMIT 5
    `);
    console.log('\n📄 Sample institute-user data:');
    (sampleInstituteUsers as any[]).forEach((rel, index) => {
      console.log(`${index + 1}. Institute: ${rel.institute_name} (ID: ${rel.institute_id})`);
      console.log(`   User: ${rel.first_name} ${rel.last_name} (ID: ${rel.user_id})`);
      console.log(`   User Type: ${rel.user_type}, Status: ${rel.status}`);
      console.log(`   Institute User ID: ${rel.user_id_institue || 'N/A'}`);
      console.log(`   Verified By: ${rel.verified_by || 'N/A'}, At: ${rel.verified_at || 'N/A'}`);
      console.log('');
    });
    
    // Check if there are any additional important tables
    console.log('\n🔍 ADDITIONAL POTENTIALLY USEFUL TABLES:');
    console.log('='.repeat(50));
    
    const potentialTables = ['courses', 'classes', 'subjects', 'departments', 'grades', 
                           'enrollments', 'payments', 'notifications', 'announcements',
                           'resources', 'assignments', 'submissions', 'attendance'];
    
    for (const tableName of potentialTables) {
      try {
        const [exists] = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables 
           WHERE table_schema = 'laas' AND table_name = '${tableName}'`
        );
        
        if ((exists as any[])[0].count > 0) {
          const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
          const [recordCount] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
          
          console.log(`\n📋 ${tableName.toUpperCase()} TABLE:`);
          console.log(`   Records: ${(recordCount as any[])[0].count}`);
          console.log(`   Columns (${(columns as any[]).length}):`, 
            (columns as any[]).map(col => col.Field).join(', ')
          );
        }
      } catch (error) {
        // Table doesn't exist or access denied - skip
      }
    }
    
    console.log('\n✅ LaaS database analysis completed!');
    
  } catch (error) {
    console.error('❌ Error analyzing LaaS database:', error);
    throw error;
  } finally {
    if (connection!) {
      await connection.end();
    }
  }
}

checkLaaSDatabase().catch(console.error);
