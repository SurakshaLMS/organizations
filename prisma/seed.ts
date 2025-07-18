import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users (these would normally come from external system)
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: await bcrypt.hash('AdminPassword123!', 12),
        name: 'Admin User',
      },
    }),
    prisma.user.upsert({
      where: { email: 'student@example.com' },
      update: {},
      create: {
        email: 'student@example.com',
        password: await bcrypt.hash('StudentPassword123!', 12),
        name: 'Student User',
      },
    }),
    prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {},
      create: {
        email: 'teacher@example.com',
        password: await bcrypt.hash('TeacherPassword123!', 12),
        name: 'Teacher User',
      },
    }),
    prisma.user.upsert({
      where: { email: 'moderator@example.com' },
      update: {},
      create: {
        email: 'moderator@example.com',
        password: await bcrypt.hash('ModeratorPassword123!', 12),
        name: 'Moderator User',
      },
    }),
    prisma.user.upsert({
      where: { email: 'president@example.com' },
      update: {},
      create: {
        email: 'president@example.com',
        password: await bcrypt.hash('PresidentPassword123!', 12),
        name: 'President User',
      },
    }),
  ]);

  // Create sample institutes
  const institutes = await Promise.all([
    prisma.institute.upsert({
      where: { instituteId: 'institute-1' },
      update: {},
      create: {
        instituteId: 'institute-1',
        name: 'University of Technology',
        imageUrl: 'https://example.com/university.jpg',
      },
    }),
    prisma.institute.upsert({
      where: { instituteId: 'institute-2' },
      update: {},
      create: {
        instituteId: 'institute-2',
        name: 'Business School',
        imageUrl: 'https://example.com/business.jpg',
      },
    }),
  ]);

  // Create institute user relationships
  await Promise.all([
    prisma.instituteUser.upsert({
      where: {
        instituteId_userId: {
          instituteId: institutes[0].instituteId,
          userId: users[0].userId,
        },
      },
      update: {},
      create: {
        instituteId: institutes[0].instituteId,
        userId: users[0].userId,
      },
    }),
    prisma.instituteUser.upsert({
      where: {
        instituteId_userId: {
          instituteId: institutes[0].instituteId,
          userId: users[1].userId,
        },
      },
      update: {},
      create: {
        instituteId: institutes[0].instituteId,
        userId: users[1].userId,
      },
    }),
  ]);

  // Create sample organizations
  const organizations = await Promise.all([
    prisma.organization.upsert({
      where: { organizationId: 'org-1' },
      update: {},
      create: {
        organizationId: 'org-1',
        name: 'Computer Science Department',
        type: 'INSTITUTE',
        isPublic: true,
      },
    }),
    prisma.organization.upsert({
      where: { organizationId: 'org-2' },
      update: {},
      create: {
        organizationId: 'org-2',
        name: 'Global Tech Community',
        type: 'GLOBAL',
        isPublic: false,
        enrollmentKey: 'GLOBAL2024',
      },
    }),
    prisma.organization.upsert({
      where: { organizationId: 'org-3' },
      update: {},
      create: {
        organizationId: 'org-3',
        name: 'Mathematics Department',
        type: 'INSTITUTE',
        isPublic: true,
      },
    }),
  ]);

  // Create organization user relationships
  await Promise.all([
    // Admin as President of CS Dept
    prisma.organizationUser.upsert({
      where: {
        organizationId_userId: {
          organizationId: organizations[0].organizationId,
          userId: users[0].userId,
        },
      },
      update: {},
      create: {
        organizationId: organizations[0].organizationId,
        userId: users[0].userId,
        role: 'PRESIDENT',
        isVerified: true,
      },
    }),
    // Student as Member of CS Dept
    prisma.organizationUser.upsert({
      where: {
        organizationId_userId: {
          organizationId: organizations[0].organizationId,
          userId: users[1].userId,
        },
      },
      update: {},
      create: {
        organizationId: organizations[0].organizationId,
        userId: users[1].userId,
        role: 'MEMBER',
        isVerified: true,
      },
    }),
    // Teacher as Admin of Global Tech
    prisma.organizationUser.upsert({
      where: {
        organizationId_userId: {
          organizationId: organizations[1].organizationId,
          userId: users[2].userId,
        },
      },
      update: {},
      create: {
        organizationId: organizations[1].organizationId,
        userId: users[2].userId,
        role: 'ADMIN',
        isVerified: true,
      },
    }),
    // Moderator as Moderator of Math Dept
    prisma.organizationUser.upsert({
      where: {
        organizationId_userId: {
          organizationId: organizations[2].organizationId,
          userId: users[3].userId,
        },
      },
      update: {},
      create: {
        organizationId: organizations[2].organizationId,
        userId: users[3].userId,
        role: 'MODERATOR',
        isVerified: true,
      },
    }),
    // President as President of Math Dept
    prisma.organizationUser.upsert({
      where: {
        organizationId_userId: {
          organizationId: organizations[2].organizationId,
          userId: users[4].userId,
        },
      },
      update: {},
      create: {
        organizationId: organizations[2].organizationId,
        userId: users[4].userId,
        role: 'PRESIDENT',
        isVerified: true,
      },
    }),
  ]);

  // Create sample causes
  const causes = await Promise.all([
    prisma.cause.create({
      data: {
        title: 'Introduction to Programming',
        description: 'Learn the basics of programming with practical examples and hands-on coding exercises.',
        organizationId: organizations[0].organizationId,
        isPublic: true,
      },
    }),
    prisma.cause.create({
      data: {
        title: 'Advanced Web Development',
        description: 'Master modern web development techniques including React, Node.js, and databases.',
        organizationId: organizations[1].organizationId,
        isPublic: false,
      },
    }),
    prisma.cause.create({
      data: {
        title: 'Data Structures and Algorithms',
        description: 'Comprehensive study of data structures and algorithmic problem solving.',
        organizationId: organizations[0].organizationId,
        isPublic: true,
      },
    }),
    prisma.cause.create({
      data: {
        title: 'Calculus Fundamentals',
        description: 'Essential calculus concepts for engineering and science students.',
        organizationId: organizations[2].organizationId,
        isPublic: true,
      },
    }),
    prisma.cause.create({
      data: {
        title: 'Machine Learning Workshop',
        description: 'Hands-on machine learning with Python and popular ML libraries.',
        organizationId: organizations[1].organizationId,
        isPublic: false,
      },
    }),
  ]);

  // Create sample lectures
  const lectures = await Promise.all([
    prisma.lecture.create({
      data: {
        title: 'Variables and Data Types',
        content: 'Understanding different data types in programming: integers, strings, booleans, and arrays. Learn how to declare and use variables effectively.',
        causeId: causes[0].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Control Flow and Loops',
        content: 'Master conditional statements (if/else) and loops (for, while) to control program execution flow.',
        causeId: causes[0].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'React Hooks Deep Dive',
        content: 'Advanced concepts in React hooks including useState, useEffect, useContext, and custom hooks.',
        causeId: causes[1].causeId,
        isPublic: false,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Node.js and Express Setup',
        content: 'Building REST APIs with Node.js and Express framework. Setting up routes, middleware, and database connections.',
        causeId: causes[1].causeId,
        isPublic: false,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Arrays and Linked Lists',
        content: 'Implementation and usage of arrays and linked lists. Time complexity analysis and practical applications.',
        causeId: causes[2].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Binary Trees and Traversals',
        content: 'Understanding binary trees, tree traversal algorithms (inorder, preorder, postorder), and tree operations.',
        causeId: causes[2].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Limits and Continuity',
        content: 'Introduction to limits, continuity, and their applications in calculus.',
        causeId: causes[3].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Derivatives and Applications',
        content: 'Computing derivatives using various rules and their practical applications.',
        causeId: causes[3].causeId,
        isPublic: true,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Python for Machine Learning',
        content: 'Introduction to Python libraries for ML: NumPy, Pandas, Scikit-learn, and Matplotlib.',
        causeId: causes[4].causeId,
        isPublic: false,
      },
    }),
    prisma.lecture.create({
      data: {
        title: 'Linear Regression Models',
        content: 'Understanding linear regression, model training, evaluation, and prediction.',
        causeId: causes[4].causeId,
        isPublic: false,
      },
    }),
  ]);

  // Create sample assignments
  const assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        title: 'Basic Calculator',
        description: 'Create a simple calculator that can perform basic arithmetic operations (addition, subtraction, multiplication, division).',
        causeId: causes[0].causeId,
        dueDate: new Date('2025-01-31'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Personal Portfolio Website',
        description: 'Build a responsive personal portfolio website showcasing your projects and skills.',
        causeId: causes[0].causeId,
        dueDate: new Date('2025-02-15'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Todo App with React',
        description: 'Build a full-featured todo application using React with add, edit, delete, and mark complete functionality.',
        causeId: causes[1].causeId,
        dueDate: new Date('2025-01-25'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'REST API with Express',
        description: 'Create a RESTful API for a blog system with user authentication and CRUD operations.',
        causeId: causes[1].causeId,
        dueDate: new Date('2025-02-10'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Binary Search Implementation',
        description: 'Implement binary search algorithm and analyze its time complexity.',
        causeId: causes[2].causeId,
        dueDate: new Date('2025-01-20'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Sorting Algorithm Comparison',
        description: 'Implement and compare different sorting algorithms (bubble sort, merge sort, quick sort).',
        causeId: causes[2].causeId,
        dueDate: new Date('2025-02-05'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Derivative Calculations',
        description: 'Solve 20 derivative problems using various differentiation rules.',
        causeId: causes[3].causeId,
        dueDate: new Date('2025-01-18'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Optimization Problems',
        description: 'Apply calculus to solve real-world optimization problems.',
        causeId: causes[3].causeId,
        dueDate: new Date('2025-02-01'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Linear Regression Project',
        description: 'Build a linear regression model to predict house prices using a given dataset.',
        causeId: causes[4].causeId,
        dueDate: new Date('2025-01-28'),
      },
    }),
    prisma.assignment.create({
      data: {
        title: 'Data Visualization Dashboard',
        description: 'Create an interactive dashboard to visualize machine learning model results.',
        causeId: causes[4].causeId,
        dueDate: new Date('2025-02-12'),
      },
    }),
  ]);

  // Create sample documentation
  const documentations = await Promise.all([
    prisma.documentation.create({
      data: {
        title: 'Programming Basics Cheat Sheet',
        content: 'Quick reference for programming fundamentals including syntax, operators, and common functions.',
        lectureId: lectures[0].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Variable Naming Conventions',
        content: 'Best practices for naming variables in different programming languages.',
        lectureId: lectures[0].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Loop Examples and Patterns',
        content: 'Common loop patterns and examples for solving programming problems.',
        lectureId: lectures[1].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'React Hooks Reference',
        content: 'Complete reference for React hooks with examples and use cases.',
        lectureId: lectures[2].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Express Middleware Guide',
        content: 'Comprehensive guide to using and creating Express middleware.',
        lectureId: lectures[3].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Array Methods Reference',
        content: 'Quick reference for common array methods and their time complexities.',
        lectureId: lectures[4].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Tree Traversal Algorithms',
        content: 'Step-by-step guide to implementing tree traversal algorithms.',
        lectureId: lectures[5].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Limit Calculation Rules',
        content: 'Rules and techniques for calculating limits in calculus.',
        lectureId: lectures[6].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Derivative Rules Summary',
        content: 'Summary of all derivative rules with examples.',
        lectureId: lectures[7].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Python ML Libraries Guide',
        content: 'Installation and usage guide for essential Python ML libraries.',
        lectureId: lectures[8].lectureId,
      },
    }),
    prisma.documentation.create({
      data: {
        title: 'Linear Regression Math',
        content: 'Mathematical foundations of linear regression and model evaluation.',
        lectureId: lectures[9].lectureId,
      },
    }),
  ]);

  // Create auth records for users
  await Promise.all(
    users.map(user =>
      prisma.userAuth.upsert({
        where: { userId: user.userId },
        update: {},
        create: {
          userId: user.userId,
          password: user.password, // Already hashed above
        },
      })
    )
  );

  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('🔐 Sample accounts created:');
  console.log('- admin@example.com (Password: AdminPassword123!) - President of CS Dept');
  console.log('- student@example.com (Password: StudentPassword123!) - Member of CS Dept');
  console.log('- teacher@example.com (Password: TeacherPassword123!) - Admin of Global Tech');
  console.log('- moderator@example.com (Password: ModeratorPassword123!) - Moderator of Math Dept');
  console.log('- president@example.com (Password: PresidentPassword123!) - President of Math Dept');
  console.log('');
  console.log('🏢 Organizations created:');
  console.log('- Computer Science Department (Public)');
  console.log('- Global Tech Community (Private, Key: GLOBAL2024)');
  console.log('- Mathematics Department (Public)');
  console.log('');
  console.log('📚 Content created:');
  console.log(`- ${causes.length} causes`);
  console.log(`- ${lectures.length} lectures`);
  console.log(`- ${assignments.length} assignments`);
  console.log(`- ${documentations.length} documentation entries`);
  console.log('');
  console.log('🎯 Test the API at: http://localhost:3000/api/v1');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
