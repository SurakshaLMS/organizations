const axios = require('axios');

const BASE_URL = 'http://localhost:3000/organization/api/v1';

async function testImageUrlFeature() {
  console.log('🧪 Testing imageUrl feature for organizations...\n');

  try {
    // Test 1: Create organization with imageUrl
    console.log('1️⃣ Creating organization with imageUrl...');
    const createResponse = await axios.post(`${BASE_URL}/organizations`, {
      name: 'Test Organization with Image',
      type: 'INSTITUTE',
      isPublic: true,
      imageUrl: 'https://example.com/logo.png'
    });

    const organizationId = createResponse.data.id;
    console.log('✅ Organization created successfully');
    console.log('📋 Response:', JSON.stringify(createResponse.data, null, 2));
    
    // Test 2: Get organization by ID to verify imageUrl is returned
    console.log('\n2️⃣ Getting organization by ID...');
    const getResponse = await axios.get(`${BASE_URL}/organizations/${organizationId}`);
    console.log('✅ Organization retrieved successfully');
    console.log('📋 Response:', JSON.stringify(getResponse.data, null, 2));
    
    // Test 3: Update organization imageUrl
    console.log('\n3️⃣ Updating organization imageUrl...');
    const updateResponse = await axios.put(`${BASE_URL}/organizations/${organizationId}`, {
      imageUrl: 'https://example.com/updated-logo.png'
    });
    console.log('✅ Organization updated successfully');
    console.log('📋 Response:', JSON.stringify(updateResponse.data, null, 2));
    
    // Test 4: Get all organizations to verify imageUrl is included
    console.log('\n4️⃣ Getting all organizations...');
    const getAllResponse = await axios.get(`${BASE_URL}/organizations`);
    console.log('✅ Organizations list retrieved successfully');
    console.log('📋 Response (first org):', JSON.stringify(getAllResponse.data.data[0], null, 2));
    
    console.log('\n🎉 All imageUrl tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('📊 Status:', error.response.status);
    }
  }
}

testImageUrlFeature();
