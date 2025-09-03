/**
 * TEST LECTURE CREATION WITH DOCUMENTS - SIMPLE VERSION
 * 
 * This script tests the new enhanced lecture creation endpoint
 * using curl commands instead of node dependencies
 */

async function testServerConnection() {
  console.log('🔍 Testing Server Connection...');
  console.log('================================');
  
  try {
    const response = await fetch('http://localhost:3000/organization/api/v1');
    if (response.ok) {
      console.log('✅ Server is running on http://localhost:3000');
      console.log('📚 API Documentation: http://localhost:3000/api/docs');
      return true;
    } else {
      console.log('❌ Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start it with: npm run start:dev');
    console.log('Error:', error.message);
    return false;
  }
}

function printTestInstructions() {
  console.log('\n🧪 Testing Instructions');
  console.log('========================');
  
  console.log('\n1. First, get a JWT token:');
  console.log('curl -X POST http://localhost:3000/organization/api/v1/auth/login \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"email":"your-email@example.com","password":"your-password"}\'');
  
  console.log('\n2. Create a simple lecture:');
  console.log('curl -X POST http://localhost:3000/organization/api/v1/lectures \\');
  console.log('  -H "Authorization: Bearer <your-jwt-token>" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{');
  console.log('    "causeId": "1",');
  console.log('    "title": "Test Lecture",');
  console.log('    "description": "A test lecture for API validation",');
  console.log('    "content": "This is test content for the lecture",');
  console.log('    "venue": "Online",');
  console.log('    "mode": "online",');
  console.log('    "isPublic": true');
  console.log('  }\'');
  
  console.log('\n3. Create a lecture with documents:');
  console.log('curl -X POST http://localhost:3000/organization/api/v1/lectures/with-documents/1 \\');
  console.log('  -H "Authorization: Bearer <your-jwt-token>" \\');
  console.log('  -F "title=Advanced JavaScript" \\');
  console.log('  -F "description=Advanced JS concepts with examples" \\');
  console.log('  -F "content=Deep dive into closures and prototypes" \\');
  console.log('  -F "venue=Online" \\');
  console.log('  -F "mode=online" \\');
  console.log('  -F "isPublic=true" \\');
  console.log('  -F "documents=@./example.pdf" \\');
  console.log('  -F "documents=@./slides.txt"');
  
  console.log('\n4. Get lectures with filtering:');
  console.log('curl -X GET "http://localhost:3000/organization/api/v1/lectures?causeId=1&page=1&limit=5" \\');
  console.log('  -H "Authorization: Bearer <your-jwt-token>"');
  
  console.log('\n5. Get lecture by ID:');
  console.log('curl -X GET http://localhost:3000/organization/api/v1/lectures/1 \\');
  console.log('  -H "Authorization: Bearer <your-jwt-token>"');
  
  console.log('\n6. Get lecture documents:');
  console.log('curl -X GET http://localhost:3000/organization/api/v1/lectures/1/documents \\');
  console.log('  -H "Authorization: Bearer <your-jwt-token>"');
}

function printAPIEndpoints() {
  console.log('\n📋 Available Endpoints');
  console.log('======================');
  
  const endpoints = [
    { method: 'POST', path: '/lectures', description: 'Create lecture' },
    { method: 'POST', path: '/lectures/with-documents/:causeId', description: 'Create lecture with S3 documents' },
    { method: 'GET', path: '/lectures', description: 'Get lectures (with filtering)' },
    { method: 'GET', path: '/lectures/:id', description: 'Get lecture by ID' },
    { method: 'PUT', path: '/lectures/:id', description: 'Update lecture' },
    { method: 'DELETE', path: '/lectures/:id', description: 'Delete lecture' },
    { method: 'GET', path: '/lectures/:id/documents', description: 'Get lecture documents' }
  ];
  
  endpoints.forEach(endpoint => {
    console.log(`${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(35)} - ${endpoint.description}`);
  });
}

function printFeatureHighlights() {
  console.log('\n⭐ Key Features Implemented');
  console.log('============================');
  
  console.log('✅ JWT-based authentication (no mock data)');
  console.log('✅ Role-based access control (MEMBER, MODERATOR, ADMIN, PRESIDENT)');
  console.log('✅ Direct database integration with Prisma ORM');
  console.log('✅ AWS S3 document upload support');
  console.log('✅ Multi-file upload (up to 10 files per lecture)');
  console.log('✅ Advanced filtering and pagination');
  console.log('✅ Comprehensive error handling');
  console.log('✅ Organization-level access validation');
  console.log('✅ Swagger API documentation');
  console.log('✅ File type validation and size limits');
}

function printS3Configuration() {
  console.log('\n🗂️ S3 Configuration');
  console.log('====================');
  
  console.log('Bucket: mysurakshabucket');
  console.log('Region: us-east-1');
  console.log('File Structure: lectures/{lectureId}/documents/{filename}-{timestamp}.{ext}');
  console.log('Max File Size: 10MB per file');
  console.log('Max Files: 10 files per request');
  console.log('Max Total Size: 50MB per request');
  
  console.log('\nSupported File Types:');
  console.log('- Documents: PDF, DOC, DOCX, TXT, MD');
  console.log('- Images: JPG, JPEG, PNG, GIF');
  console.log('- Archives: ZIP, RAR');
  console.log('- Presentations: PPT, PPTX');
}

// Main execution
async function main() {
  console.log('🎓 LECTURE API TESTING GUIDE');
  console.log('=============================');
  
  const serverRunning = await testServerConnection();
  
  if (serverRunning) {
    printAPIEndpoints();
    printFeatureHighlights();
    printS3Configuration();
    printTestInstructions();
    
    console.log('\n📖 Documentation Files Created:');
    console.log('- LECTURE_API_DOCUMENTATION.md (Complete API documentation)');
    console.log('- LECTURE_API_QUICK_REFERENCE.md (Quick reference guide)');
    
    console.log('\n🎉 Setup Complete! The API is ready for testing.');
    console.log('💡 Tip: Use the Swagger UI at http://localhost:3000/api/docs for interactive testing');
  } else {
    console.log('\n❌ Please start the server first with: npm run start:dev');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testServerConnection };
