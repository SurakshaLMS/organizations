import fetch from 'node-fetch';

async function testManualSync() {
  const baseUrl = 'http://localhost:3001/organization/api/v1/sync';
  
  try {
    console.log('🧪 Testing Manual Sync Functionality...\n');

    // Test manual sync for specific table
    console.log('📊 Testing Manual Sync for Users Table...');
    const manualSyncResponse = await fetch(`${baseUrl}/manual`, {
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
    
    const manualSyncData = await manualSyncResponse.json();
    console.log('Manual Sync Response:');
    console.log(JSON.stringify(manualSyncData, null, 2));
    console.log('\n');

    // Test sync logs
    console.log('📋 Testing Sync Logs Endpoint...');
    const logsResponse = await fetch(`${baseUrl}/logs`);
    const logsData = await logsResponse.json();
    console.log('Sync Logs Response (last 5 entries):');
    const recentLogs = logsData.logs ? logsData.logs.slice(0, 5) : [];
    console.log(JSON.stringify({ ...logsData, logs: recentLogs }, null, 2));
    console.log('\n');

    // Test manual sync for all tables
    console.log('🔄 Testing Manual Sync for All Tables...');
    const fullSyncResponse = await fetch(`${baseUrl}/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName: 'all',
        username: 'admin',
        password: 'Skaveesha1355660'
      })
    });
    
    const fullSyncData = await fullSyncResponse.json();
    console.log('Full Manual Sync Response:');
    console.log(JSON.stringify(fullSyncData, null, 2));
    console.log('\n');

    // Test invalid credentials
    console.log('🚫 Testing Invalid Credentials...');
    const invalidSyncResponse = await fetch(`${baseUrl}/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableName: 'users',
        username: 'invalid',
        password: 'invalid'
      })
    });
    
    const invalidSyncData = await invalidSyncResponse.json();
    console.log('Invalid Credentials Response:');
    console.log(JSON.stringify(invalidSyncData, null, 2));
    console.log('\n');

    console.log('✅ All manual sync tests completed!');
  } catch (error) {
    console.error('❌ Manual sync test failed:', error.message);
  }
}

testManualSync();
