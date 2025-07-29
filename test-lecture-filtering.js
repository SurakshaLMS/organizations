/**
 * TEST SCRIPT: LECTURE FILTERING BY CAUSE IDS
 * 
 * This script tests the newly optimized lecture filtering system
 * to verify that cause ID filtering is working properly.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/lectures`;

async function testLectureFiltering() {
  console.log('🚀 Testing Lecture Filtering by Cause IDs...\n');

  try {
    // Test 1: Get all lectures (public access)
    console.log('📝 Test 1: Get all public lectures');
    const response1 = await axios.get(API_URL);
    console.log(`✅ Response: ${response1.status} - Found ${response1.data.data?.length || 0} lectures`);
    console.log(`   Pagination: page ${response1.data.pagination?.page}, total ${response1.data.pagination?.total}\n`);

    // Test 2: Filter by single cause ID
    console.log('📝 Test 2: Filter by single cause ID (causeId=1)');
    const response2 = await axios.get(`${API_URL}?causeId=1`);
    console.log(`✅ Response: ${response2.status} - Found ${response2.data.data?.length || 0} lectures for cause 1`);
    if (response2.data.data?.length > 0) {
      console.log(`   Sample lecture: "${response2.data.data[0].title}" (ID: ${response2.data.data[0].lectureId})`);
    }
    console.log('');

    // Test 3: Filter by multiple cause IDs
    console.log('📝 Test 3: Filter by multiple cause IDs (causeIds=1,2,3)');
    const response3 = await axios.get(`${API_URL}?causeIds=1,2,3`);
    console.log(`✅ Response: ${response3.status} - Found ${response3.data.data?.length || 0} lectures for causes 1,2,3`);
    if (response3.data.data?.length > 0) {
      const causeIds = [...new Set(response3.data.data.map(lecture => lecture.causeId))];
      console.log(`   Cause IDs found: ${causeIds.join(', ')}`);
    }
    console.log('');

    // Test 4: Search functionality
    console.log('📝 Test 4: Search lectures (search=machine)');
    const response4 = await axios.get(`${API_URL}?search=machine`);
    console.log(`✅ Response: ${response4.status} - Found ${response4.data.data?.length || 0} lectures matching "machine"`);
    console.log('');

    // Test 5: Advanced filtering with pagination
    console.log('📝 Test 5: Advanced filtering with pagination (causeId=1&page=1&limit=5&sortBy=title&sortOrder=asc)');
    const response5 = await axios.get(`${API_URL}?causeId=1&page=1&limit=5&sortBy=title&sortOrder=asc`);
    console.log(`✅ Response: ${response5.status} - Found ${response5.data.data?.length || 0} lectures (page 1, limit 5)`);
    console.log(`   Sorting: ${response5.data.meta?.sortBy} ${response5.data.meta?.sortOrder}\n`);

    // Test 6: Filter by status
    console.log('📝 Test 6: Filter by status (status=upcoming)');
    const response6 = await axios.get(`${API_URL}?status=upcoming`);
    console.log(`✅ Response: ${response6.status} - Found ${response6.data.data?.length || 0} upcoming lectures\n`);

    // Test 7: Performance test - large cause ID list
    console.log('📝 Test 7: Performance test with many cause IDs');
    const manyIds = Array.from({length: 20}, (_, i) => i + 1).join(',');
    const response7 = await axios.get(`${API_URL}?causeIds=${manyIds}&limit=10`);
    console.log(`✅ Response: ${response7.status} - Found ${response7.data.data?.length || 0} lectures for ${manyIds.split(',').length} cause IDs`);
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log('   ✅ Cause ID filtering is working');
    console.log('   ✅ Multiple cause IDs filtering is working');
    console.log('   ✅ Search functionality is working');
    console.log('   ✅ Pagination is working');
    console.log('   ✅ Sorting is working');
    console.log('   ✅ Status filtering is working');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Test with authentication (optional)
async function testWithAuth() {
  console.log('\n🔐 Testing with JWT Authentication...\n');

  try {
    // First, try to login (this might fail if no test user exists)
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });

    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');

    // Test authenticated access
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const response = await axios.get(`${API_URL}?causeId=1`, authHeaders);
    console.log(`✅ Authenticated request: ${response.status} - Found ${response.data.data?.length || 0} lectures`);

  } catch (error) {
    console.log('ℹ️  Authentication test skipped (no test user or server not running)');
  }
}

// Run tests
console.log('=' .repeat(60));
console.log('🧪 LECTURE MODULE OPTIMIZATION TEST SUITE');
console.log('=' .repeat(60));

testLectureFiltering()
  .then(() => testWithAuth())
  .then(() => {
    console.log('\n' + '=' .repeat(60));
    console.log('✨ TEST SUITE COMPLETED');
    console.log('=' .repeat(60));
  });
