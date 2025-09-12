/**
 * CAUSE API TEST SCRIPT
 * 
 * This script demonstrates how to properly call the Cause API endpoints
 * and handles the validation requirements correctly.
 */

const BASE_URL = 'http://localhost:3000/organization/api/v1';

// Example JWT token - replace with your actual token
const JWT_TOKEN = 'your-jwt-token-here';

/**
 * Test creating a basic cause (no image)
 */
async function testCreateBasicCause() {
  console.log('🧪 Testing: Create Basic Cause');
  
  try {
    const response = await fetch(`${BASE_URL}/causes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify({
        organizationId: "1", // Must be string, not number!
        title: "Test Environmental Initiative",
        description: "A test initiative to verify API functionality",
        introVideoUrl: "https://youtube.com/watch?v=test123",
        isPublic: false
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Test creating a cause with image upload
 */
async function testCreateCauseWithImage() {
  console.log('🧪 Testing: Create Cause with Image');
  
  try {
    const formData = new FormData();
    formData.append('organizationId', '1'); // String format
    formData.append('title', 'Test Cause with Image');
    formData.append('description', 'Testing image upload functionality');
    formData.append('isPublic', 'false');
    
    // If you have an image file, uncomment this line:
    // formData.append('image', fileInput.files[0]);

    const response = await fetch(`${BASE_URL}/causes/with-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
        // Note: Don't set Content-Type for FormData - browser sets it automatically
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Test getting all causes
 */
async function testGetCauses() {
  console.log('🧪 Testing: Get All Causes');
  
  try {
    const response = await fetch(`${BASE_URL}/causes?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Test getting a specific cause by ID
 */
async function testGetCauseById(causeId) {
  console.log(`🧪 Testing: Get Cause by ID (${causeId})`);
  
  try {
    const response = await fetch(`${BASE_URL}/causes/${causeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Test updating a cause
 */
async function testUpdateCause(causeId) {
  console.log(`🧪 Testing: Update Cause (${causeId})`);
  
  try {
    const response = await fetch(`${BASE_URL}/causes/${causeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`
      },
      body: JSON.stringify({
        title: "Updated Test Cause Title",
        description: "Updated description for testing",
        isPublic: true
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result);
      return result;
    } else {
      console.log('❌ Error:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
  console.log('🚀 Starting Cause API Tests\n');
  
  // Test 1: Create basic cause
  const createdCause = await testCreateBasicCause();
  console.log('\n---\n');
  
  // Test 2: Create cause with image
  await testCreateCauseWithImage();
  console.log('\n---\n');
  
  // Test 3: Get all causes
  await testGetCauses();
  console.log('\n---\n');
  
  // Test 4: Get specific cause (if we created one)
  if (createdCause && createdCause.causeId) {
    await testGetCauseById(createdCause.causeId);
    console.log('\n---\n');
    
    // Test 5: Update the cause
    await testUpdateCause(createdCause.causeId);
  }
  
  console.log('\n🏁 Tests completed!');
}

// Export functions for individual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCreateBasicCause,
    testCreateCauseWithImage,
    testGetCauses,
    testGetCauseById,
    testUpdateCause,
    runAllTests
  };
}

// Run tests automatically if script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('📋 Cause API Test Script Loaded');
  console.log('Call runAllTests() to start testing');
} else if (require.main === module) {
  // Node.js environment
  runAllTests();
}

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. In Browser Console:
 *    - Copy and paste this entire script
 *    - Update JWT_TOKEN with your actual token
 *    - Run: runAllTests()
 * 
 * 2. In Node.js:
 *    - Save this file as test-cause-api.js
 *    - Update JWT_TOKEN with your actual token
 *    - Run: node test-cause-api.js
 * 
 * 3. Individual Tests:
 *    - testCreateBasicCause()
 *    - testCreateCauseWithImage()
 *    - testGetCauses()
 *    - etc.
 */

/**
 * CORRECT REQUEST FORMAT:
 * 
 * The error you encountered was due to:
 * 1. Missing required fields (organizationId, title)
 * 2. Incorrect data types (organizationId must be string, not number)
 * 
 * Correct format:
 * {
 *   "organizationId": "1",     // String, not number!
 *   "title": "Your Title",     // Required, non-empty
 *   "description": "...",      // Optional
 *   "introVideoUrl": "...",    // Optional, must be valid URL
 *   "isPublic": false          // Optional boolean
 * }
 */