#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3003/organization/api/v1';

async function testEnrollAPI() {
  console.log('🧪 Testing Organization Enroll API...\n');

  // Test cases
  const testCases = [
    {
      name: 'Valid numeric string',
      data: { organizationId: "27", enrollmentKey: "CS2024" },
      expectSuccess: true
    },
    {
      name: 'Invalid non-numeric string',
      data: { organizationId: "abc", enrollmentKey: "CS2024" },
      expectSuccess: false
    },
    {
      name: 'Number instead of string',
      data: { organizationId: 27, enrollmentKey: "CS2024" },
      expectSuccess: true // Should work because DTO validation transforms it
    },
    {
      name: 'Empty organizationId',
      data: { organizationId: "", enrollmentKey: "CS2024" },
      expectSuccess: false
    },
    {
      name: 'Missing organizationId',
      data: { enrollmentKey: "CS2024" },
      expectSuccess: false
    },
    {
      name: 'Null organizationId',
      data: { organizationId: null, enrollmentKey: "CS2024" },
      expectSuccess: false
    }
  ];

  const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"; // Dummy token for testing validation

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Data: ${JSON.stringify(testCase.data)}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/organizations/enroll`, testCase.data, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 5000
      });
      
      if (testCase.expectSuccess) {
        console.log(`   ✅ Success (as expected): ${response.status}`);
      } else {
        console.log(`   ❌ Unexpected success: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        console.log(`   🔴 Error ${status}: ${data.message || JSON.stringify(data)}`);
        
        if (!testCase.expectSuccess) {
          console.log(`   ✅ Expected error (validation working)`);
        } else {
          console.log(`   ❌ Unexpected error`);
        }
      } else {
        console.log(`   🔴 Network/Request Error: ${error.message}`);
      }
    }
    console.log('');
  }
}

// Check if server is running first
axios.get(`${BASE_URL}/organizations`)
  .then(() => {
    console.log('🟢 Server is running, starting tests...\n');
    testEnrollAPI();
  })
  .catch(() => {
    console.log('🔴 Server is not running on http://localhost:3003/organization/api/v1');
    console.log('Please start the server with: npm run start:dev');
  });
