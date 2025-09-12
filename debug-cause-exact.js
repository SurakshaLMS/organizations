// 🚨 CAUSE VALIDATION DEBUGGER
// This will show EXACTLY what's happening with your request

const debugCauseValidation = async () => {
    console.log('🔍 CAUSE API VALIDATION DEBUGGER\n');
    
    const baseURL = 'http://localhost:3000';
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your token
    
    // Test different request formats to see which one fails
    const testCases = [
        {
            name: '✅ CORRECT FORMAT',
            data: {
                organizationId: "1",
                title: "Test Cause"
            }
        },
        {
            name: '❌ NUMBER organizationId (should fail)',
            data: {
                organizationId: 1,
                title: "Test Cause"
            }
        },
        {
            name: '❌ EMPTY title (should fail)',
            data: {
                organizationId: "1",
                title: ""
            }
        },
        {
            name: '❌ MISSING organizationId (should fail)',
            data: {
                title: "Test Cause"
            }
        },
        {
            name: '❌ MISSING title (should fail)',
            data: {
                organizationId: "1"
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        console.log('Request body:', JSON.stringify(testCase.data, null, 2));
        
        try {
            const response = await fetch(`${baseURL}/organization/api/v1/causes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${JWT_TOKEN}`
                },
                body: JSON.stringify(testCase.data)
            });
            
            const result = await response.json();
            
            console.log(`Status: ${response.status}`);
            if (response.ok) {
                console.log('✅ SUCCESS:', result.causeId ? `Created cause ID: ${result.causeId}` : result);
            } else {
                console.log('❌ VALIDATION ERRORS:');
                if (result.message && Array.isArray(result.message)) {
                    result.message.forEach(msg => console.log(`   - ${msg}`));
                } else {
                    console.log('   -', result.message || result);
                }
            }
        } catch (error) {
            console.log('🚨 Network Error:', error.message);
        }
        
        console.log('─'.repeat(60));
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log('If the CORRECT FORMAT still fails, the issue might be:');
    console.log('1. Invalid JWT token (expired or wrong format)');
    console.log('2. Wrong server URL (not localhost:3000)');
    console.log('3. Server not running');
    console.log('4. Database connection issues');
    console.log('5. Organization with ID "1" does not exist');
    
    console.log('\n🔧 To check if organizationId "1" exists, run:');
    console.log('GET http://localhost:3000/organization/api/v1/organizations');
};

// Check server status first
const checkServer = async () => {
    try {
        const response = await fetch('http://localhost:3000');
        console.log(`Server Status: ${response.status} ${response.statusText}`);
        return true;
    } catch (error) {
        console.log('🚨 Server is not running on localhost:3000');
        console.log('Start your server first with: npm run start:dev');
        return false;
    }
};

// Main execution
const runDebug = async () => {
    console.log('Checking server status...');
    const serverRunning = await checkServer();
    
    if (serverRunning) {
        await debugCauseValidation();
    }
};

runDebug().catch(console.error);