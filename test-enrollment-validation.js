#!/usr/bin/env node

/**
 * ENROLLMENT API VALIDATION TEST
 * 
 * This script tests the enrollment API validation without needing authentication
 * to verify that our improved error messages are working correctly.
 */

const http = require('http');

console.log('🧪 Testing Enrollment API Validation\n');

function makeRequest(data, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: '/organization/api/v1/organizations/enroll',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer test-token' // This will fail auth but we want to test validation first
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData,
            description
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            description
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message, description });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  const testCases = [
    {
      description: 'Valid numeric string (should fail auth, not validation)',
      data: { organizationId: "27", enrollmentKey: "CS2024" }
    },
    {
      description: 'Invalid: Number instead of string',
      data: { organizationId: 27, enrollmentKey: "CS2024" }
    },
    {
      description: 'Invalid: Non-numeric string',
      data: { organizationId: "abc", enrollmentKey: "CS2024" }
    },
    {
      description: 'Invalid: Empty string',
      data: { organizationId: "", enrollmentKey: "CS2024" }
    },
    {
      description: 'Invalid: Missing organizationId',
      data: { enrollmentKey: "CS2024" }
    }
  ];

  console.log('🚀 Server should be running on http://localhost:3003\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 ${testCase.description}`);
      console.log(`   Request: ${JSON.stringify(testCase.data)}`);
      
      const result = await makeRequest(testCase.data, testCase.description);
      
      if (result.status === 400) {
        // Validation error (expected for invalid cases)
        console.log(`   ✅ Validation Error (${result.status}): ${result.data.message || JSON.stringify(result.data)}`);
      } else if (result.status === 401) {
        // Auth error (expected for valid validation but invalid token)
        console.log(`   ✅ Auth Error (${result.status}): Validation passed, authentication failed (expected)`);
      } else {
        console.log(`   📊 Status ${result.status}: ${JSON.stringify(result.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Request Error: ${error.error || error.message}`);
    }
    console.log('');
  }

  console.log('🔍 What to Look For:');
  console.log('   • Status 400 = Validation error (good for invalid inputs)');
  console.log('   • Status 401 = Auth error (good for valid inputs with invalid token)');
  console.log('   • Improved error messages with specific guidance');
  console.log('');
}

// Test server connectivity first
console.log('Checking server connectivity...');
const healthCheck = http.request({
  hostname: 'localhost',
  port: 3003,
  path: '/organization/api/v1/organizations',
  method: 'GET'
}, (res) => {
  console.log(`✅ Server is running (status: ${res.statusCode})\n`);
  runTests();
});

healthCheck.on('error', (error) => {
  console.log('❌ Server is not running or not accessible');
  console.log('   Please make sure the server is started with: npm run start:dev');
  console.log(`   Error: ${error.message}`);
});

healthCheck.end();
