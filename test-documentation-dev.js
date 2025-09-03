// Test Documentation API - Development Mode (No Authentication Required)

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/documentation';

async function testDocumentationAPI() {
  console.log('🧪 Testing Documentation API - Development Mode');
  console.log('==================================================');

  try {
    // Test 1: Create Documentation
    console.log('\n1. Creating documentation...');
    const createData = {
      lectureId: "1",
      title: "Introduction to Node.js",
      description: "Comprehensive guide to Node.js fundamentals",
      content: "# Node.js Basics\n\nNode.js is a JavaScript runtime...",
      docUrl: "https://example.com/nodejs-guide.pdf"
    };

    const createResponse = await axios.post(BASE_URL, createData);
    console.log('✅ Documentation created:', createResponse.data);
    const docId = createResponse.data.id;

    // Test 2: Get All Documentation
    console.log('\n2. Getting all documentation...');
    const getAllResponse = await axios.get(`${BASE_URL}?page=1&limit=10`);
    console.log('✅ All documentation:', getAllResponse.data);

    // Test 3: Get Documentation by ID
    console.log('\n3. Getting documentation by ID...');
    const getByIdResponse = await axios.get(`${BASE_URL}/${docId}`);
    console.log('✅ Documentation by ID:', getByIdResponse.data);

    // Test 4: Update Documentation
    console.log('\n4. Updating documentation...');
    const updateData = {
      title: "Advanced Node.js Concepts",
      description: "Updated comprehensive guide to advanced Node.js"
    };
    const updateResponse = await axios.put(`${BASE_URL}/${docId}`, updateData);
    console.log('✅ Documentation updated:', updateResponse.data);

    // Test 5: Get Documentation by Lecture
    console.log('\n5. Getting documentation by lecture...');
    const getByLectureResponse = await axios.get(`${BASE_URL}/lecture/1`);
    console.log('✅ Documentation by lecture:', getByLectureResponse.data);

    // Test 6: Search Documentation
    console.log('\n6. Searching documentation...');
    const searchResponse = await axios.get(`${BASE_URL}?search=Node.js&page=1&limit=5`);
    console.log('✅ Search results:', searchResponse.data);

    // Test 7: Delete Documentation
    console.log('\n7. Deleting documentation...');
    const deleteResponse = await axios.delete(`${BASE_URL}/${docId}`);
    console.log('✅ Documentation deleted:', deleteResponse.data);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test API endpoints
async function testEndpoints() {
  console.log('📋 Available Documentation Endpoints:');
  console.log('=====================================');
  console.log('POST   /documentation           - Create documentation');
  console.log('GET    /documentation           - Get all documentation (with pagination/search)');
  console.log('GET    /documentation/:id       - Get documentation by ID');
  console.log('PUT    /documentation/:id       - Update documentation');
  console.log('DELETE /documentation/:id       - Delete documentation');
  console.log('GET    /documentation/lecture/:lectureId - Get documentation by lecture');
  console.log('\n💡 No authentication required in development mode!');
  console.log('🔧 Mock user with ADMIN access is automatically used.');
}

// Show usage
testEndpoints();

// Uncomment to run actual tests (make sure server is running on port 3000)
// testDocumentationAPI();
