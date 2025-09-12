// 🚨 CAUSE API - EXACT WORKING TEST
// Run this with: node test-cause-exact-fix.js

const testCauseAPI = async () => {
    const baseURL = 'http://localhost:3000';
    
    // ⚠️ REPLACE WITH YOUR ACTUAL JWT TOKEN
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
    
    console.log('🧪 Testing Cause API with EXACT format...\n');
    
    // Test 1: Minimal required fields (this should work)
    const testData1 = {
        organizationId: "1",    // ✅ STRING format (not number!)
        title: "Test Cause from Script"  // ✅ Required field
    };
    
    // Test 2: Complete data
    const testData2 = {
        organizationId: "1",
        title: "Complete Test Cause",
        description: "This is a test cause with all fields",
        introVideoUrl: "https://youtube.com/watch?v=test",
        isPublic: false
    };
    
    const testCause = async (testData, testName) => {
        console.log(`📋 ${testName}:`);
        console.log('Request Data:', JSON.stringify(testData, null, 2));
        
        try {
            const response = await fetch(`${baseURL}/organization/api/v1/causes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${JWT_TOKEN}`
                },
                body: JSON.stringify(testData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                console.log('✅ SUCCESS!');
                console.log('Response:', result);
                console.log('Cause ID:', result.causeId);
            } else {
                console.log('❌ ERROR!');
                console.log('Status:', response.status);
                console.log('Error:', result);
            }
        } catch (error) {
            console.log('🚨 NETWORK ERROR:', error.message);
        }
        
        console.log('─'.repeat(50));
    };
    
    // Run tests
    await testCause(testData1, 'Test 1: Minimal Required Fields');
    await testCause(testData2, 'Test 2: Complete Data');
    
    console.log('\n🔍 DEBUGGING TIPS:');
    console.log('1. Make sure your JWT_TOKEN is valid and not expired');
    console.log('2. Ensure server is running on localhost:3000');
    console.log('3. organizationId must be STRING "1" not number 1');
    console.log('4. title field is required and cannot be empty');
    console.log('5. Content-Type: application/json header is required');
};

// Run the test
testCauseAPI().catch(console.error);

// Export for CommonJS
module.exports = { testCauseAPI };