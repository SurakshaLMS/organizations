import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function futureDateFromNow(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Cleaning existing data...');
    await prisma.assignment.deleteMany();
    await prisma.documentation.deleteMany();
    await prisma.lecture.deleteMany();
    await prisma.cause.deleteMany();
    await prisma.organizationUser.deleteMany();
    await prisma.instituteUser.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
    await prisma.institute.deleteMany();
    console.log('✅ Cleaned existing data');

    // Create Institutes
    console.log('🏛️ Creating institutes...');
    const institutes: any[] = [];
    const instituteData = [
      { name: 'Harvard University', imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800' },
      { name: 'Stanford University', imageUrl: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=800' },
      { name: 'Massachusetts Institute of Technology', imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800' },
      { name: 'Yale University', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800' },
      { name: 'Princeton University', imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' },
      { name: 'University of California Berkeley', imageUrl: 'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=800' },
      { name: 'Oxford University', imageUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800' },
      { name: 'Cambridge University', imageUrl: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=800' }
    ];
    
    for (let i = 0; i < instituteData.length; i++) {
      const institute = await prisma.institute.create({
        data: {
          name: instituteData[i].name,
          code: `INST${String(i + 1).padStart(3, '0')}`,
          email: `admin${i + 1}@institute.edu`,
          imageUrl: instituteData[i].imageUrl,
        },
      });
      institutes.push(institute);
    }
    console.log(`✅ Created ${institutes.length} institutes`);

    // Create Users
    console.log('👥 Creating users...');
    const users: any[] = [];
    const userProfiles = [
      { name: 'Dr. Emily Johnson', email: 'emily.johnson@university.edu' },
      { name: 'Prof. Michael Chen', email: 'michael.chen@university.edu' },
      { name: 'Sarah Williams', email: 'sarah.williams@university.edu' },
      { name: 'David Rodriguez', email: 'david.rodriguez@university.edu' },
      { name: 'Dr. Lisa Thompson', email: 'lisa.thompson@university.edu' },
      { name: 'James Wilson', email: 'james.wilson@university.edu' },
      { name: 'Dr. Maria Garcia', email: 'maria.garcia@university.edu' },
      { name: 'Robert Brown', email: 'robert.brown@university.edu' },
      { name: 'Dr. Jennifer Lee', email: 'jennifer.lee@university.edu' },
      { name: 'Christopher Davis', email: 'christopher.davis@university.edu' },
      { name: 'Amanda Miller', email: 'amanda.miller@university.edu' },
      { name: 'Daniel Anderson', email: 'daniel.anderson@university.edu' },
      { name: 'Dr. Jessica Taylor', email: 'jessica.taylor@university.edu' },
      { name: 'Matthew Thomas', email: 'matthew.thomas@university.edu' },
      { name: 'Ashley Jackson', email: 'ashley.jackson@university.edu' },
      { name: 'Dr. Kevin White', email: 'kevin.white@university.edu' },
      { name: 'Nicole Harris', email: 'nicole.harris@university.edu' },
      { name: 'Ryan Martin', email: 'ryan.martin@university.edu' },
      { name: 'Dr. Rachel Green', email: 'rachel.green@university.edu' },
      { name: 'Brandon Clark', email: 'brandon.clark@university.edu' },
      { name: 'Admin User', email: 'ia@gmail.com' }, // Keep the specific user for testing
    ];
    
    for (let i = 0; i < userProfiles.length; i++) {
      const isTestUser = userProfiles[i].email === 'ia@gmail.com';
      const nameParts = userProfiles[i].name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      
      const user = await prisma.user.create({
        data: {
          email: userProfiles[i].email,
          password: await hashPassword(isTestUser ? 'Password123@' : `Password${i + 1}!`),
          firstName: firstName,
          lastName: lastName || 'User',
          user_type: 'USER',
          district: 'COLOMBO',
          province: 'WESTERN',
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    // Create Organizations
    console.log('🏢 Creating organizations...');
    const organizations: any[] = [];
    const orgData = [
      { name: 'Computer Science Student Association', type: 'INSTITUTE', isPublic: true, enrollmentKey: 'CS2024' },
      { name: 'Mathematics Research Society', type: 'INSTITUTE', isPublic: true, enrollmentKey: 'MATH2024' },
      { name: 'Physics Innovation Lab', type: 'INSTITUTE', isPublic: false, enrollmentKey: 'PHYSICS2024' },
      { name: 'Global Environmental Initiative', type: 'GLOBAL', isPublic: true, enrollmentKey: 'ENV2024' },
      { name: 'International Student Union', type: 'GLOBAL', isPublic: true, enrollmentKey: 'ISU2024' },
      { name: 'Engineering Excellence Club', type: 'INSTITUTE', isPublic: true, enrollmentKey: 'ENG2024' },
      { name: 'Digital Innovation Hub', type: 'GLOBAL', isPublic: false, enrollmentKey: 'TECH2024' },
      { name: 'Biomedical Research Alliance', type: 'INSTITUTE', isPublic: true, enrollmentKey: 'BIOMED2024' },
      { name: 'Sustainable Future Foundation', type: 'GLOBAL', isPublic: true, enrollmentKey: 'SUSTAIN2024' },
      { name: 'Academic Excellence Network', type: 'INSTITUTE', isPublic: false, enrollmentKey: 'ACADEMIC2024' },
    ];
    
    for (let i = 0; i < orgData.length; i++) {
      const organization = await prisma.organization.create({
        data: {
          name: orgData[i].name,
          type: orgData[i].type as 'INSTITUTE' | 'GLOBAL',
          isPublic: orgData[i].isPublic,
          enrollmentKey: orgData[i].enrollmentKey,
          instituteId: orgData[i].type === 'INSTITUTE' ? institutes[i % institutes.length].instituteId : null,
        },
      });
      organizations.push(organization);
    }
    console.log(`✅ Created ${organizations.length} organizations`);

    // Create Causes
    console.log('🎯 Creating causes...');
    const causes: any[] = [];
    const causeData = [
      { title: 'Climate Change Awareness', description: 'Educating students about climate science and sustainable practices', videoUrl: 'https://videos.example.com/climate-change.mp4', isPublic: true },
      { title: 'Digital Literacy for All', description: 'Bridging the digital divide through technology education', videoUrl: 'https://videos.example.com/digital-literacy.mp4', isPublic: true },
      { title: 'Mental Health Support Network', description: 'Creating support systems for student mental wellness', videoUrl: 'https://videos.example.com/mental-health.mp4', isPublic: true },
      { title: 'STEM Diversity Initiative', description: 'Promoting diversity and inclusion in STEM fields', videoUrl: 'https://videos.example.com/stem-diversity.mp4', isPublic: true },
      { title: 'Community Service Learning', description: 'Connecting academic learning with community service', videoUrl: 'https://videos.example.com/community-service.mp4', isPublic: true },
      { title: 'Innovation in Healthcare', description: 'Exploring cutting-edge medical technologies and treatments', videoUrl: 'https://videos.example.com/healthcare-innovation.mp4', isPublic: false },
      { title: 'Artificial Intelligence Ethics', description: 'Examining the ethical implications of AI development', videoUrl: 'https://videos.example.com/ai-ethics.mp4', isPublic: true },
      { title: 'Renewable Energy Research', description: 'Advancing sustainable energy solutions for the future', videoUrl: 'https://videos.example.com/renewable-energy.mp4', isPublic: true },
      { title: 'Global Economic Development', description: 'Understanding international economic challenges and solutions', videoUrl: 'https://videos.example.com/economic-development.mp4', isPublic: false },
      { title: 'Cultural Exchange Program', description: 'Fostering cross-cultural understanding and collaboration', videoUrl: 'https://videos.example.com/cultural-exchange.mp4', isPublic: true },
      { title: 'Quantum Computing Fundamentals', description: 'Exploring the principles and applications of quantum computing', videoUrl: 'https://videos.example.com/quantum-computing.mp4', isPublic: false },
      { title: 'Social Justice Advocacy', description: 'Promoting equality and human rights through education', videoUrl: 'https://videos.example.com/social-justice.mp4', isPublic: true },
    ];
    
    for (let i = 0; i < causeData.length; i++) {
      const orgId = organizations[i % organizations.length].organizationId;
      console.log(`Creating cause "${causeData[i].title}" for organization ID: ${orgId}`);
      
      const cause = await prisma.cause.create({
        data: {
          organizationId: orgId,
          title: causeData[i].title,
          description: causeData[i].description,
          introVideoUrl: causeData[i].videoUrl,
          isPublic: causeData[i].isPublic,
        },
      });
      causes.push(cause);
    }
    console.log(`✅ Created ${causes.length} causes`);

    // Create Lectures
    console.log('📚 Creating lectures...');
    const lectures: any[] = [];
    const lectureTopics = [
      'Introduction and Fundamentals',
      'Advanced Concepts and Theory',
      'Practical Applications',
      'Case Studies and Examples',
      'Interactive Workshop',
      'Guest Speaker Session',
      'Research Methodologies',
      'Future Trends and Implications',
      'Hands-on Laboratory',
      'Project Presentations',
      'Q&A and Discussion',
      'Assessment and Review',
    ];
    
    for (let i = 0; i < 36; i++) { // 3 lectures per cause
      const cause = causes[i % causes.length];
      const topicIndex = i % lectureTopics.length;
      const isOnline = Math.random() > 0.4; // 60% online lectures
      const startDate = futureDateFromNow(Math.floor(i / 3) * 7 + (i % 3) * 2 + 1); // Spread lectures over weeks
      const endDate = new Date(startDate.getTime() + (isOnline ? 90 : 120) * 60000); // 1.5-2 hours
      
      const lecture = await prisma.lecture.create({
        data: {
          causeId: cause.causeId,
          title: `${lectureTopics[topicIndex]}: ${cause.title}`,
          description: `Comprehensive ${lectureTopics[topicIndex].toLowerCase()} covering key aspects of ${cause.title.toLowerCase()}. This session will provide both theoretical foundations and practical insights.`,
          content: `Detailed lecture content for ${lectureTopics[topicIndex]} in the context of ${cause.title}. Topics include background theory, current research, practical applications, and future directions in this field.`,
          venue: isOnline ? 'Virtual Classroom' : `Lecture Hall ${Math.floor(Math.random() * 10) + 1}`,
          mode: isOnline ? 'online' : 'physical',
          timeStart: startDate,
          timeEnd: endDate,
          liveLink: isOnline ? `https://meet.google.com/lecture-${cause.causeId}-${i + 1}` : null,
          liveMode: isOnline ? (Math.random() > 0.5 ? 'meet' : 'zoom') : null,
          isPublic: cause.isPublic && Math.random() > 0.2, // Most public causes have public lectures
        },
      });
      lectures.push(lecture);
    }
    console.log(`✅ Created ${lectures.length} lectures`);

    // Create Assignments
    console.log('📝 Creating assignments...');
    const assignmentTypes = [
      'Research Paper',
      'Project Proposal',
      'Case Study Analysis',
      'Literature Review',
      'Practical Implementation',
      'Group Presentation',
      'Data Analysis Report',
      'Design Challenge',
      'Field Study',
      'Critical Essay',
    ];
    
    let assignmentCount = 0;
    for (let i = 0; i < causes.length; i++) {
      const cause = causes[i];
      const numAssignments = Math.floor(Math.random() * 3) + 1; // 1-3 assignments per cause
      
      for (let j = 0; j < numAssignments; j++) {
        const assignmentType = assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)];
        const dueDate = futureDateFromNow(14 + i * 7 + j * 5); // Spread due dates over time
        
        await prisma.assignment.create({
          data: {
            causeId: cause.causeId,
            title: `${assignmentType}: ${cause.title}`,
            description: `Complete a comprehensive ${assignmentType.toLowerCase()} focusing on ${cause.title.toLowerCase()}. This assignment should demonstrate understanding of key concepts, critical thinking, and practical application of the subject matter. Include relevant research, analysis, and your own insights.`,
            dueDate: dueDate,
          },
        });
        assignmentCount++;
      }
    }
    console.log(`✅ Created ${assignmentCount} assignments`);

    // Create Documentation
    console.log('📄 Creating documentation...');
    const docTypes = [
      'Lecture Notes',
      'Reading List',
      'Supplementary Materials',
      'Video Resources',
      'Practice Exercises',
      'Reference Guide',
      'Research Papers',
      'Case Studies',
      'Quick Reference',
      'Study Guide',
    ];
    
    let docCount = 0;
    for (let i = 0; i < lectures.length; i++) {
      const lecture = lectures[i];
      const numDocs = Math.floor(Math.random() * 3) + 1; // 1-3 docs per lecture
      
      for (let j = 0; j < numDocs; j++) {
        const docType = docTypes[Math.floor(Math.random() * docTypes.length)];
        await prisma.documentation.create({
          data: {
            lectureId: lecture.lectureId,
            title: `${docType}: ${lecture.title}`,
            description: `${docType} for the lecture "${lecture.title}". This document provides additional context, resources, and materials to support learning objectives and enhance understanding of the covered topics.`,
            content: `Comprehensive ${docType.toLowerCase()} containing detailed information, examples, and references related to ${lecture.title}. Includes theoretical background, practical applications, and additional resources for further study.`,
            docUrl: `https://docs.university.edu/${lecture.lectureId}/doc-${j + 1}-${docType.toLowerCase().replace(' ', '-')}.pdf`,
          },
        });
        docCount++;
      }
    }
    console.log(`✅ Created ${docCount} documentation entries`);

    // Create Institute-User relationships
    console.log('🔗 Creating institute-user relationships...');
    let instituteUserCount = 0;
    for (let i = 0; i < users.length; i++) {
      // Each user belongs to 1-3 institutes
      const numInstitutes = Math.floor(Math.random() * 3) + 1;
      const userInstitutes = new Set();
      
      for (let j = 0; j < numInstitutes; j++) {
        const institute = institutes[Math.floor(Math.random() * institutes.length)];
        if (!userInstitutes.has(institute.instituteId)) {
          userInstitutes.add(institute.instituteId);
          await prisma.instituteUser.create({
            data: {
              instituteId: institute.instituteId,
              userId: users[i].userId,
              status: Math.random() > 0.1 ? 'ACTIVE' : 'PENDING', // 90% active users
            },
          });
          instituteUserCount++;
        }
      }
    }
    console.log(`✅ Created ${instituteUserCount} institute-user relationships`);

    // Create Organization-User relationships
    console.log('👥 Creating organization-user relationships...');
    let orgUserCount = 0;
    for (let i = 0; i < users.length; i++) {
      // Each user joins 1-4 organizations
      const numOrgs = Math.floor(Math.random() * 4) + 1;
      const userOrgs = new Set();
      
      for (let j = 0; j < numOrgs; j++) {
        const org = organizations[Math.floor(Math.random() * organizations.length)];
        if (!userOrgs.has(org.organizationId)) {
          userOrgs.add(org.organizationId);
          await prisma.organizationUser.create({
            data: {
              organizationId: org.organizationId,
              userId: users[i].userId,
              role: Math.random() > 0.85 ? 'ADMIN' : Math.random() > 0.75 ? 'MODERATOR' : Math.random() > 0.9 ? 'PRESIDENT' : 'MEMBER',
              isVerified: Math.random() > 0.3, // 70% verified users
            },
          });
          orgUserCount++;
        }
      }
    }
    console.log(`✅ Created ${orgUserCount} organization-user relationships`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`🏛️  Institutes: ${institutes.length}`);
    console.log(`👥 Users: ${users.length}`);
    console.log(`🔗 Institute-User relationships: ${instituteUserCount}`);
    console.log(`🏢 Organizations: ${organizations.length}`);
    console.log(`👥 Organization-User relationships: ${orgUserCount}`);
    console.log(`🎯 Causes: ${causes.length}`);
    console.log(`📚 Lectures: ${lectures.length}`);
    console.log(`📝 Assignments: ${assignmentCount}`);
    console.log(`📄 Documentation: ${docCount}`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
