const axios = require('axios');

const BASE_URL = 'http://localhost:3000/organization/api/v1';

async function verifyTestOrganization() {
  console.log('🔍 Verifying our test organization...\n');

  try {
    // Get all organizations
    const response = await axios.get(`${BASE_URL}/organizations`);
    
    // Find our test organization
    const testOrg = response.data.data.find(org => 
      org.name === 'Test Organization with Image'
    );
    
    if (testOrg) {
      console.log('✅ Found our test organization:');
      console.log(JSON.stringify(testOrg, null, 2));
      
      if (testOrg.imageUrl === 'https://example.com/updated-logo.png') {
        console.log('\n✅ ImageUrl is correctly updated to the latest value!');
      } else {
        console.log('\n⚠️  ImageUrl may not be the expected updated value');
      }
    } else {
      console.log('❌ Test organization not found in listing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

verifyTestOrganization();
