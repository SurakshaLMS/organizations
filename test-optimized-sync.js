async function testOptimizedSync() {
  const baseUrl = 'http://localhost:3001/organization/api/v1/sync';
  
  try {
    console.log('Testing optimized sync system...\n');

    // Test sync status
    console.log('1. Testing sync status...');
    const statusResponse = await fetch(`${baseUrl}/status`);
    const statusData = await statusResponse.json();
    console.log('Status:', statusResponse.status);
    console.log('Response:', JSON.stringify(statusData, null, 2));
    console.log('\n');

    // Test manual sync for users table
    console.log('2. Testing manual sync for users...');
    const manualResponse = await fetch(`${baseUrl}/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName: 'users',
        username: 'admin',
        password: 'Skaveesha1355660'
      })
    });
    const manualData = await manualResponse.json();
    console.log('Status:', manualResponse.status);
    console.log('Response:', JSON.stringify(manualData, null, 2));
    console.log('\n');

    // Test sync dashboard
    console.log('3. Testing sync dashboard...');
    const dashboardResponse = await fetch(`${baseUrl}/dashboard`);
    const dashboardData = await dashboardResponse.json();
    console.log('Status:', dashboardResponse.status);
    console.log('Response:', JSON.stringify(dashboardData, null, 2));
    console.log('\n');

    // Test sync logs
    console.log('4. Testing sync logs...');
    const logsResponse = await fetch(`${baseUrl}/logs`);
    const logsData = await logsResponse.json();
    console.log('Status:', logsResponse.status);
    console.log('Response:', JSON.stringify(logsData, null, 2));

  } catch (error) {
    console.error('Error testing sync:', error);
  }
}

testOptimizedSync();
