import fetch from 'node-fetch';

async function testSyncEndpoints() {
  const baseUrl = 'http://localhost:3001/organization/api/v1/sync';
  
  try {
    console.log('🧪 Testing Sync API Endpoints...\n');

    // Test dashboard endpoint
    console.log('📊 Testing Dashboard Endpoint...');
    const dashboardResponse = await fetch(`${baseUrl}/dashboard`);
    const dashboardData = await dashboardResponse.json();
    console.log('Dashboard Response:');
    console.log(JSON.stringify(dashboardData, null, 2));
    console.log('\n');

    // Test status endpoint
    console.log('📈 Testing Status Endpoint...');
    const statusResponse = await fetch(`${baseUrl}/status`);
    const statusData = await statusResponse.json();
    console.log('Status Response:');
    console.log(JSON.stringify(statusData, null, 2));
    console.log('\n');

    console.log('✅ All endpoint tests completed successfully!');
  } catch (error) {
    console.error('❌ Endpoint test failed:', error.message);
  }
}

testSyncEndpoints();
