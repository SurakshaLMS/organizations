// 🚨 VALIDATION ISSUE DIAGNOSIS
// This script will help identify the exact validation problem

const diagnoseCauseValidation = async () => {
    console.log('🔍 VALIDATION ISSUE DIAGNOSIS\n');
    
    const baseURL = 'http://localhost:3000';
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your token
    
    console.log('📋 Testing different request scenarios...\n');
    
    // Test cases to identify the exact validation issue
    const testCases = [
        {
            name: '1. Minimal Valid Request',
            description: 'Only required fields with correct format',
            data: {
                organizationId: "1",
                title: "Test Cause"
            }
        },
        {
            name: '2. Valid Request with Optional Fields',
            description: 'All valid optional fields included',
            data: {
                organizationId: "1",
                title: "Test Cause",
                description: "Test description",
                isPublic: false
            }
        },
        {
            name: '3. Request with Extra Unknown Field',
            description: 'Should fail due to forbidNonWhitelisted',
            data: {
                organizationId: "1",
                title: "Test Cause",
                unknownField: "This should cause error"
            }
        },
        {
            name: '4. Request with Wrong Type',
            description: 'organizationId as number instead of string',
            data: {
                organizationId: 1,
                title: "Test Cause"
            }
        },
        {
            name: '5. Request with Empty Required Field',
            description: 'Empty title should fail',
            data: {
                organizationId: "1",
                title: ""
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🧪 ${testCase.name}`);
        console.log(`📝 ${testCase.description}`);
        console.log('📤 Request Body:', JSON.stringify(testCase.data, null, 2));
        
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
            
            console.log(`📈 Status: ${response.status}`);
            
            if (response.ok) {
                console.log('✅ SUCCESS:', result.causeId ? `Created: ${result.causeId}` : 'Created successfully');
            } else {
                console.log('❌ VALIDATION ERRORS:');
                if (result.message && Array.isArray(result.message)) {
                    result.message.forEach((msg, index) => {
                        console.log(`   ${index + 1}. ${msg}`);
                    });
                } else {
                    console.log(`   - ${result.message || 'Unknown error'}`);
                }
                
                // Show validation pipe analysis
                if (result.message && Array.isArray(result.message)) {
                    const hasOrganizationIdError = result.message.some(msg => msg.includes('organizationId'));
                    const hasTitleError = result.message.some(msg => msg.includes('title'));
                    const hasWhitelistError = result.message.some(msg => msg.includes('should not exist') || msg.includes('unknown'));
                    
                    console.log('\n🔍 ERROR ANALYSIS:');
                    if (hasOrganizationIdError) console.log('   ⚠️  organizationId validation failed');
                    if (hasTitleError) console.log('   ⚠️  title validation failed');
                    if (hasWhitelistError) console.log('   ⚠️  Extra fields rejected (forbidNonWhitelisted)');
                }
            }
        } catch (error) {
            console.log('🚨 Network Error:', error.message);
        }
        
        console.log('─'.repeat(70));
    }
    
    console.log('\n🔬 VALIDATION PIPELINE ANALYSIS:');
    console.log('Your app uses these validation settings:');
    console.log('✓ whitelist: true - Only allow DTO fields');
    console.log('✓ forbidNonWhitelisted: true - Reject extra fields');
    console.log('✓ transform: true - Transform to DTO types');
    console.log('✓ enableImplicitConversion: true - Auto-convert types');
    
    console.log('\n💡 COMMON ISSUES:');
    console.log('1. Sending organizationId as number instead of string');
    console.log('2. Including extra fields not in CreateCauseDto');
    console.log('3. Missing Content-Type: application/json header');
    console.log('4. Invalid or expired JWT token');
    console.log('5. Wrong endpoint URL');
    
    console.log('\n✅ EXACT WORKING FORMAT:');
    console.log('POST /organization/api/v1/causes');
    console.log('Headers: Content-Type: application/json, Authorization: Bearer TOKEN');
    console.log('Body: {"organizationId":"1","title":"Test Cause"}');
};

// Check server and JWT token
const checkPrerequisites = async () => {
    console.log('🔧 Checking prerequisites...\n');
    
    // Check server
    try {
        const response = await fetch('http://localhost:3000');
        console.log(`✅ Server running: ${response.status} ${response.statusText}`);
    } catch (error) {
        console.log('❌ Server not running on localhost:3000');
        console.log('   Start with: npm run start:dev');
        return false;
    }
    
    // Check JWT token format
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE';
    if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
        console.log('⚠️  Replace JWT_TOKEN in this script with your actual token');
        return false;
    }
    
    console.log('✅ Prerequisites look good\n');
    return true;
};

// Main execution
const runDiagnosis = async () => {
    const prereqsOk = await checkPrerequisites();
    if (prereqsOk) {
        await diagnoseCauseValidation();
    }
};

runDiagnosis().catch(console.error);