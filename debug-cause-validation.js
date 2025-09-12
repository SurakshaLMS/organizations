// 🚀 CAUSE API VALIDATION DEBUGGER
// This script helps identify and fix validation issues

console.log('🔧 Cause API Validation Debugger');

// ✅ CORRECT REQUEST FORMAT
const correctRequest = {
  method: 'POST',
  url: 'http://localhost:3000/organization/api/v1/causes',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token-here'
  },
  body: {
    organizationId: "1",        // ⚠️ MUST be string, not number
    title: "Test Cause Title"   // ⚠️ REQUIRED field
    // description: "Optional",   // Optional
    // introVideoUrl: "https://youtube.com/watch?v=test", // Optional (must be valid URL)
    // isPublic: false            // Optional (boolean)
  }
};

console.log('✅ Correct request format:');
console.log(JSON.stringify(correctRequest, null, 2));

// ❌ COMMON MISTAKES THAT CAUSE VALIDATION ERRORS

const commonMistakes = [
  {
    issue: 'Missing organizationId',
    wrongRequest: {
      title: "Test Title"
      // organizationId missing
    },
    error: 'organizationId should not be empty'
  },
  {
    issue: 'organizationId as number instead of string',
    wrongRequest: {
      organizationId: 1,  // ❌ Number
      title: "Test Title"
    },
    error: 'organizationId must be a string'
  },
  {
    issue: 'Missing title',
    wrongRequest: {
      organizationId: "1"
      // title missing
    },
    error: 'title should not be empty'
  },
  {
    issue: 'Empty title',
    wrongRequest: {
      organizationId: "1",
      title: ""  // ❌ Empty string
    },
    error: 'title should not be empty'
  },
  {
    issue: 'Extra non-whitelisted fields',
    wrongRequest: {
      organizationId: "1",
      title: "Test Title",
      extraField: "not allowed"  // ❌ Not in DTO
    },
    error: 'property extraField should not exist'
  },
  {
    issue: 'Invalid URL format',
    wrongRequest: {
      organizationId: "1",
      title: "Test Title",
      introVideoUrl: "not-a-url"  // ❌ Invalid URL
    },
    error: 'introVideoUrl must be an URL address'
  }
];

console.log('\n❌ Common mistakes that cause validation errors:');
commonMistakes.forEach((mistake, index) => {
  console.log(`\n${index + 1}. ${mistake.issue}:`);
  console.log('   Wrong request:', JSON.stringify(mistake.wrongRequest, null, 2));
  console.log('   Error:', mistake.error);
});

// 🧪 TEST FUNCTION
async function testCauseCreation(requestBody, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/organization/api/v1/causes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your-jwt-token-here'  // Replace with actual token
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
    } else {
      console.log('❌ Validation Error:', result);
      
      // Analyze the error
      if (result.message && Array.isArray(result.message)) {
        console.log('\n🔍 Error Analysis:');
        result.message.forEach(msg => {
          if (msg.includes('organizationId')) {
            console.log('   - Issue with organizationId field');
          }
          if (msg.includes('title')) {
            console.log('   - Issue with title field');
          }
          if (msg.includes('should not be empty')) {
            console.log('   - Missing required field');
          }
          if (msg.includes('must be a string')) {
            console.log('   - Type mismatch (probably number instead of string)');
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
}

// 🚀 RUN TESTS
async function runValidationTests() {
  console.log('\n🚀 Running Validation Tests...\n');
  
  // Test 1: Correct request
  await testCauseCreation({
    organizationId: "1",
    title: "Test Environmental Initiative"
  }, "Minimal correct request");
  
  // Test 2: Wrong organizationId type
  await testCauseCreation({
    organizationId: 1,  // Number instead of string
    title: "Test Title"
  }, "Wrong organizationId type (number)");
  
  // Test 3: Missing title
  await testCauseCreation({
    organizationId: "1"
  }, "Missing title");
  
  // Test 4: Empty title
  await testCauseCreation({
    organizationId: "1",
    title: ""
  }, "Empty title");
  
  // Test 5: Full valid request
  await testCauseCreation({
    organizationId: "1",
    title: "Complete Environmental Initiative",
    description: "A comprehensive initiative to promote environmental awareness",
    introVideoUrl: "https://youtube.com/watch?v=example",
    isPublic: false
  }, "Full valid request");
}

// 📋 QUICK FIX GUIDE
console.log('\n📋 QUICK FIX GUIDE:');
console.log('1. Ensure organizationId is a STRING: "1" not 1');
console.log('2. Ensure title is provided and not empty');
console.log('3. Remove any extra fields not in the DTO');
console.log('4. Use valid URLs for introVideoUrl if provided');
console.log('5. Use correct endpoint: POST /organization/api/v1/causes');
console.log('6. Include JWT token in Authorization header');

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    correctRequest,
    testCauseCreation,
    runValidationTests
  };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('\n📞 To test validation, run: runValidationTests()');
}