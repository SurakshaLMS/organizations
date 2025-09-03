// Test script for Documentation API endpoints
const axios = require('axios');

const API_BASE = 'http://localhost:3000/documentation';

async function testDocumentationAPI() {
  console.log('🧪 Testing Documentation API...\n');
  
  try {
    // Test 1: Create documentation
    console.log('📝 Test 1: Creating documentation...');
    const createData = {
      lectureId: "1",
      title: "Sample Documentation",
      description: "This is a test documentation for lecture 1",
      content: "# Sample Documentation\n\nThis is the content of the documentation with markdown support.",
      docUrl: "https://example.com/document.pdf"
    };
    
    const createResponse = await axios.post(API_BASE, createData);
    console.log('✅ Documentation created:', createResponse.data);
    
    const docId = createResponse.data.id;
    
    // Test 2: Get all documentation
    console.log('\n📋 Test 2: Getting all documentation...');
    const getAllResponse = await axios.get(API_BASE);
    console.log('✅ All documentation retrieved:', getAllResponse.data);
    
    // Test 3: Get documentation by ID
    console.log('\n🔍 Test 3: Getting documentation by ID...');
    const getByIdResponse = await axios.get(`${API_BASE}/${docId}`);
    console.log('✅ Documentation by ID retrieved:', getByIdResponse.data);
    
    // Test 4: Update documentation
    console.log('\n✏️ Test 4: Updating documentation...');
    const updateData = {
      title: "Updated Documentation Title",
      description: "Updated description"
    };
    const updateResponse = await axios.put(`${API_BASE}/${docId}`, updateData);
    console.log('✅ Documentation updated:', updateResponse.data);
    
    // Test 5: Get documentation by lecture
    console.log('\n📚 Test 5: Getting documentation by lecture...');
    const getByLectureResponse = await axios.get(`${API_BASE}/lecture/1`);
    console.log('✅ Documentation by lecture retrieved:', getByLectureResponse.data);
    
    // Test 6: Search documentation
    console.log('\n🔎 Test 6: Searching documentation...');
    const searchResponse = await axios.get(`${API_BASE}?search=Sample`);
    console.log('✅ Search results:', searchResponse.data);
    
    console.log('\n🎉 All tests passed! Documentation API is working correctly.');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Uncomment to run tests (make sure the server is running)
// testDocumentationAPI();
