import fetch from 'node-fetch';

async function quickTest() {
  try {
    console.log('Testing logs endpoint...');
    const response = await fetch('http://localhost:3001/organization/api/v1/sync/logs');
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

quickTest();
