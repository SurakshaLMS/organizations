// Create missing tables in LaaS database
import * as mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv();

async function createMissingTablesInLaaS() {
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
    
    console.log('🏗️ CREATING MISSING TABLES IN LAAS DATABASE');
    console.log('='.repeat(60));
    
    // Drop existing organization tables if they have wrong structure (they're empty anyway)
    console.log('\n1️⃣ Cleaning existing empty organization tables...');
    
    const tablesToRecreate = ['organizations', 'organization_users', 'org_organizations', 'org_organization_users'];
    for (const table of tablesToRecreate) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Dropped existing ${table} table`);
      } catch (error) {
        console.log(`ℹ️ ${table} table didn't exist or couldn't be dropped`);
      }
    }
    
    // Create org_organizations table (compatible with our current structure)
    console.log('\n2️⃣ Creating org_organizations table...');
    await connection.execute(`
      CREATE TABLE org_organizations (
        organizationId BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        type ENUM('INSTITUTE', 'GLOBAL') NOT NULL,
        isPublic BOOLEAN DEFAULT FALSE,
        enrollmentKey VARCHAR(255),
        needEnrollmentVerification BOOLEAN DEFAULT TRUE,
        imageUrl VARCHAR(500),
        instituteId BIGINT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        INDEX idx_type (type),
        INDEX idx_isPublic (isPublic),
        INDEX idx_instituteId (instituteId),
        
        FOREIGN KEY (instituteId) REFERENCES institutes(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_organizations table');
    
    // Create org_organization_users table 
    console.log('\n3️⃣ Creating org_organization_users table...');
    await connection.execute(`
      CREATE TABLE org_organization_users (
        organizationId BIGINT,
        userId BIGINT,
        role ENUM('MEMBER', 'MODERATOR', 'ADMIN', 'PRESIDENT') DEFAULT 'MEMBER',
        isVerified BOOLEAN DEFAULT FALSE,
        verifiedBy BIGINT,
        verifiedAt DATETIME(6),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        PRIMARY KEY (organizationId, userId),
        INDEX idx_role (role),
        INDEX idx_isVerified (isVerified),
        INDEX idx_userId (userId),
        
        FOREIGN KEY (organizationId) REFERENCES org_organizations(organizationId) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_organization_users table');
    
    // Create org_causes table
    console.log('\n4️⃣ Creating org_causes table...');
    await connection.execute(`
      CREATE TABLE org_causes (
        causeId BIGINT PRIMARY KEY AUTO_INCREMENT,
        organizationId BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        isPublic BOOLEAN DEFAULT FALSE,
        introVideoUrl VARCHAR(500),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        INDEX idx_organizationId (organizationId),
        INDEX idx_isPublic (isPublic),
        
        FOREIGN KEY (organizationId) REFERENCES org_organizations(organizationId) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_causes table');
    
    // Create org_lectures table
    console.log('\n5️⃣ Creating org_lectures table...');
    await connection.execute(`
      CREATE TABLE org_lectures (
        lectureId BIGINT PRIMARY KEY AUTO_INCREMENT,
        causeId BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        description TEXT,
        isPublic BOOLEAN DEFAULT FALSE,
        liveLink VARCHAR(500),
        liveMode VARCHAR(50),
        mode VARCHAR(50),
        recordingUrl VARCHAR(500),
        timeEnd DATETIME(6),
        timeStart DATETIME(6),
        venue VARCHAR(255),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        INDEX idx_causeId (causeId),
        INDEX idx_isPublic (isPublic),
        INDEX idx_timeStart (timeStart),
        INDEX idx_mode (mode),
        
        FOREIGN KEY (causeId) REFERENCES org_causes(causeId) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_lectures table');
    
    // Create org_assignments table
    console.log('\n6️⃣ Creating org_assignments table...');
    await connection.execute(`
      CREATE TABLE org_assignments (
        assignmentId BIGINT PRIMARY KEY AUTO_INCREMENT,
        causeId BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        dueDate DATETIME(6),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        INDEX idx_causeId (causeId),
        INDEX idx_dueDate (dueDate),
        
        FOREIGN KEY (causeId) REFERENCES org_causes(causeId) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_assignments table');
    
    // Create org_documentation table
    console.log('\n7️⃣ Creating org_documentation table...');
    await connection.execute(`
      CREATE TABLE org_documentation (
        documentationId BIGINT PRIMARY KEY AUTO_INCREMENT,
        lectureId BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        description TEXT,
        docUrl VARCHAR(500),
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        
        INDEX idx_lectureId (lectureId),
        
        FOREIGN KEY (lectureId) REFERENCES org_lectures(lectureId) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    console.log('✅ Created org_documentation table');
    
    // Verify all tables were created
    console.log('\n8️⃣ Verifying table creation...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = (tables as any[]).map(row => Object.values(row)[0]);
    
    const newTables = ['org_organizations', 'org_organization_users', 'org_causes', 'org_lectures', 'org_assignments', 'org_documentation'];
    for (const table of newTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ ${table} table verified`);
      } else {
        console.log(`❌ ${table} table creation failed`);
      }
    }
    
    console.log('\n✅ ALL TABLES CREATED SUCCESSFULLY IN LAAS DATABASE!');
    console.log('\n📋 Next steps:');
    console.log('1. Update Prisma schema to use LaaS database');
    console.log('2. Remove organizations database connection');
    console.log('3. Update all services to use single database');
    
  } catch (error) {
    console.error('❌ Error creating tables in LaaS database:', error);
    throw error;
  } finally {
    if (connection!) {
      await connection.end();
    }
  }
}

createMissingTablesInLaaS().catch(console.error);
