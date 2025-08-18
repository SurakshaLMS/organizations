// Migrate data from organizations database to LaaS database
import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';

configDotenv();

// Connect to LaaS database (target)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LAAS_DATABASE_URL
    }
  }
});

async function migrateOrganizationsData() {
  let sourceConnection: mysql.Connection;
  
  try {
    // Connect to old organizations database (source)
    sourceConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: 'organizations', // Old database
      timezone: '+00:00',
    });
    
    console.log('🔄 MIGRATING DATA FROM ORGANIZATIONS DB TO LAAS DB');
    console.log('='.repeat(60));
    
    // First, check what institutes exist in LaaS
    console.log('\n0️⃣ Checking available institutes in LaaS...');
    const existingInstitutes = await prisma.institute.findMany({
      select: { instituteId: true, name: true }
    });
    console.log('Available institutes in LaaS:');
    existingInstitutes.forEach(inst => {
      console.log(`  - ID: ${inst.instituteId}, Name: ${inst.name}`);
    });
    
    // 1. Migrate Organizations
    console.log('\n1️⃣ Migrating organizations...');
    const [orgRows] = await sourceConnection.execute(`
      SELECT organizationId, name, type, isPublic, enrollmentKey, 
             needEnrollmentVerification, imageUrl, instituteId,
             createdAt, updatedAt
      FROM organization
      ORDER BY organizationId
    `);
    
    const organizations = orgRows as any[];
    console.log(`Found ${organizations.length} organizations to migrate`);
    
    for (const org of organizations) {
      // Check if instituteId exists in LaaS, if not set to null
      let mappedInstituteId: bigint | null = null;
      if (org.instituteId) {
        const instituteExists = existingInstitutes.some(inst => 
          inst.instituteId === BigInt(org.instituteId)
        );
        if (instituteExists) {
          mappedInstituteId = BigInt(org.instituteId);
        } else {
          console.log(`⚠️ Institute ID ${org.instituteId} not found in LaaS, setting to null for organization: ${org.name}`);
        }
      }
      
      await prisma.organization.create({
        data: {
          organizationId: BigInt(org.organizationId),
          name: org.name,
          type: org.type,
          isPublic: Boolean(org.isPublic),
          enrollmentKey: org.enrollmentKey,
          needEnrollmentVerification: Boolean(org.needEnrollmentVerification),
          imageUrl: org.imageUrl,
          instituteId: mappedInstituteId,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        },
      });
    }
    console.log(`✅ Migrated ${organizations.length} organizations`);
    
    // 2. Migrate Organization Users
    console.log('\n2️⃣ Migrating organization users...');
    const [orgUserRows] = await sourceConnection.execute(`
      SELECT organizationId, userId, role, isVerified, verifiedBy, 
             verifiedAt, createdAt, updatedAt
      FROM organization_users
      ORDER BY organizationId, userId
    `);
    
    const orgUsers = orgUserRows as any[];
    console.log(`Found ${orgUsers.length} organization-user relationships to migrate`);
    
    for (const orgUser of orgUsers) {
      try {
        await prisma.organizationUser.create({
          data: {
            organizationId: BigInt(orgUser.organizationId),
            userId: BigInt(orgUser.userId),
            role: orgUser.role,
            isVerified: Boolean(orgUser.isVerified),
            verifiedBy: orgUser.verifiedBy ? BigInt(orgUser.verifiedBy) : null,
            verifiedAt: orgUser.verifiedAt,
            createdAt: orgUser.createdAt,
            updatedAt: orgUser.updatedAt,
          },
        });
      } catch (error) {
        console.log(`⚠️ Skipping org user relationship ${orgUser.organizationId}-${orgUser.userId}: User might not exist in LaaS`);
      }
    }
    console.log(`✅ Migrated organization users (some may have been skipped if users don't exist)`);
    
    // 3. Migrate Causes
    console.log('\n3️⃣ Migrating causes...');
    const [causeRows] = await sourceConnection.execute(`
      SELECT causeId, organizationId, title, description, isPublic, 
             introVideoUrl, createdAt, updatedAt
      FROM cause
      ORDER BY causeId
    `);
    
    const causes = causeRows as any[];
    console.log(`Found ${causes.length} causes to migrate`);
    
    for (const cause of causes) {
      await prisma.cause.create({
        data: {
          causeId: BigInt(cause.causeId),
          organizationId: BigInt(cause.organizationId),
          title: cause.title,
          description: cause.description,
          isPublic: Boolean(cause.isPublic),
          introVideoUrl: cause.introVideoUrl,
          createdAt: cause.createdAt,
          updatedAt: cause.updatedAt,
        },
      });
    }
    console.log(`✅ Migrated ${causes.length} causes`);
    
    // 4. Migrate Lectures
    console.log('\n4️⃣ Migrating lectures...');
    const [lectureRows] = await sourceConnection.execute(`
      SELECT lectureId, causeId, title, content, description, isPublic,
             liveLink, liveMode, mode, recordingUrl, timeEnd, timeStart, 
             venue, createdAt, updatedAt
      FROM lecture
      ORDER BY lectureId
    `);
    
    const lectures = lectureRows as any[];
    console.log(`Found ${lectures.length} lectures to migrate`);
    
    for (const lecture of lectures) {
      await prisma.lecture.create({
        data: {
          lectureId: BigInt(lecture.lectureId),
          causeId: BigInt(lecture.causeId),
          title: lecture.title,
          content: lecture.content,
          description: lecture.description,
          isPublic: Boolean(lecture.isPublic),
          liveLink: lecture.liveLink,
          liveMode: lecture.liveMode,
          mode: lecture.mode,
          recordingUrl: lecture.recordingUrl,
          timeEnd: lecture.timeEnd,
          timeStart: lecture.timeStart,
          venue: lecture.venue,
          createdAt: lecture.createdAt,
          updatedAt: lecture.updatedAt,
        },
      });
    }
    console.log(`✅ Migrated ${lectures.length} lectures`);
    
    // 5. Migrate Assignments
    console.log('\n5️⃣ Migrating assignments...');
    const [assignmentRows] = await sourceConnection.execute(`
      SELECT assignmentId, causeId, title, description, dueDate, 
             createdAt, updatedAt
      FROM assignment
      ORDER BY assignmentId
    `);
    
    const assignments = assignmentRows as any[];
    console.log(`Found ${assignments.length} assignments to migrate`);
    
    for (const assignment of assignments) {
      await prisma.assignment.create({
        data: {
          assignmentId: BigInt(assignment.assignmentId),
          causeId: BigInt(assignment.causeId),
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          createdAt: assignment.createdAt,
          updatedAt: assignment.updatedAt,
        },
      });
    }
    console.log(`✅ Migrated ${assignments.length} assignments`);
    
    // 6. Migrate Documentation
    console.log('\n6️⃣ Migrating documentation...');
    const [docRows] = await sourceConnection.execute(`
      SELECT documentationId, lectureId, title, content, description, 
             docUrl, createdAt, updatedAt
      FROM documentation
      ORDER BY documentationId
    `);
    
    const docs = docRows as any[];
    console.log(`Found ${docs.length} documentation entries to migrate`);
    
    for (const doc of docs) {
      await prisma.documentation.create({
        data: {
          documentationId: BigInt(doc.documentationId),
          lectureId: BigInt(doc.lectureId),
          title: doc.title,
          content: doc.content,
          description: doc.description,
          docUrl: doc.docUrl,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      });
    }
    console.log(`✅ Migrated ${docs.length} documentation entries`);
    
    // 7. Verify migration
    console.log('\n7️⃣ Verifying migration...');
    const [newOrgCount, newOrgUserCount, newCauseCount, newLectureCount, newAssignmentCount, newDocCount] = await Promise.all([
      prisma.organization.count(),
      prisma.organizationUser.count(),
      prisma.cause.count(),
      prisma.lecture.count(),
      prisma.assignment.count(),
      prisma.documentation.count(),
    ]);
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Organizations: ${newOrgCount} migrated`);
    console.log(`✅ Organization Users: ${newOrgUserCount} migrated`);
    console.log(`✅ Causes: ${newCauseCount} migrated`);
    console.log(`✅ Lectures: ${newLectureCount} migrated`);
    console.log(`✅ Assignments: ${newAssignmentCount} migrated`);
    console.log(`✅ Documentation: ${newDocCount} migrated`);
    
    console.log('\n🎉 DATA MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Next Steps:');
    console.log('1. Test the application with LaaS database');
    console.log('2. Update services to remove sync logic');
    console.log('3. Remove organizations database references');
    console.log('4. Update institute user services to get user roles from users.user_type');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (sourceConnection!) {
      await sourceConnection.end();
    }
    await prisma.$disconnect();
  }
}

migrateOrganizationsData().catch(console.error);
