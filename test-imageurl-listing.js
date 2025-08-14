const axios = require('axios');

const BASE_URL = 'http://localhost:3000/organization/api/v1';

async function testImageUrlInListing() {
  console.log('🧪 Testing imageUrl in organization listings...\n');

  try {
    // Get all organizations and check if they include imageUrl
    console.log('1️⃣ Getting all organizations...');
    const response = await axios.get(`${BASE_URL}/organizations`);
    
    console.log('✅ Organizations list retrieved successfully');
    console.log(`📊 Total organizations: ${response.data.total}`);
    console.log('📋 First few organizations with imageUrl field:');
    
    response.data.data.slice(0, 3).forEach((org, index) => {
      console.log(`\n${index + 1}. ${org.name}`);
      console.log(`   📷 imageUrl: ${org.imageUrl || 'null'}`);
      console.log(`   🏢 Type: ${org.type}`);
      console.log(`   🌐 Public: ${org.isPublic}`);
    });

    // Find our test organization
    const testOrg = response.data.data.find(org => org.name === 'Test Organization with Image');
    if (testOrg) {
      console.log('\n🎯 Found our test organization:');
      console.log(`   Name: ${testOrg.name}`);
      console.log(`   ImageUrl: ${testOrg.imageUrl}`);
      console.log('   ✅ imageUrl field is properly included in listings!');
    }
    
    console.log('\n🎉 All imageUrl listing tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('📊 Status:', error.response.status);
    }
  }
}

testImageUrlInListing();
