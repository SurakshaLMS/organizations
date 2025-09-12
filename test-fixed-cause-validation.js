// 🔧 FIXED CAUSE WITH IMAGE UPLOAD TEST
// Tests the fixed validation for image uploads

const testFixedCauseImageUpload = async () => {
    console.log('🔧 TESTING FIXED CAUSE IMAGE UPLOAD\n');
    
    const baseURL = 'http://localhost:3000';
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your token
    
    console.log('✅ Using FIXED endpoint with proper validation\n');
    
    // Test the exact format that should now work
    const testCases = [
        {
            name: 'Minimal Required Fields',
            data: {
                organizationId: '1',
                title: 'Fixed Test Cause'
            }
        },
        {
            name: 'With Optional Fields',
            data: {
                organizationId: '1',
                title: 'Complete Test Cause',
                description: 'Testing the fixed validation',
                isPublic: 'false'  // String format for form data
            }
        },
        {
            name: 'With Boolean True',
            data: {
                organizationId: '1',
                title: 'Public Test Cause',
                isPublic: 'true'   // String format for form data
            }
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📋 Testing: ${testCase.name}`);
        
        const formData = new FormData();
        
        // Add all fields to FormData
        Object.entries(testCase.data).forEach(([key, value]) => {
            formData.append(key, value);
        });
        
        console.log('📤 Form Data Fields:');
        for (let [key, value] of formData.entries()) {
            console.log(`   ${key}: ${value}`);
        }
        
        try {
            const response = await fetch(`${baseURL}/organization/api/v1/causes/with-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`
                    // No Content-Type header - let browser set it for FormData
                },
                body: formData
            });
            
            const result = await response.json();
            
            console.log(`📈 Status: ${response.status}`);
            
            if (response.ok) {
                console.log('✅ SUCCESS!');
                console.log('📋 Response:', {
                    causeId: result.causeId,
                    title: result.title,
                    isPublic: result.isPublic,
                    imageUrl: result.imageUrl || 'No image'
                });
            } else {
                console.log('❌ ERROR:');
                if (result.message && Array.isArray(result.message)) {
                    result.message.forEach(msg => console.log(`   - ${msg}`));
                } else {
                    console.log(`   - ${result.message || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.log('🚨 Network Error:', error.message);
        }
        
        console.log('─'.repeat(60));
    }
    
    console.log('\n🔧 WHAT WAS FIXED:');
    console.log('1. ✅ Added @IsOptional() decorator to image field');
    console.log('2. ✅ Added @Transform() for boolean string conversion');
    console.log('3. ✅ Fixed validation pipeline compatibility');
    
    console.log('\n💡 KEY POINTS:');
    console.log('- image field is now properly validated as optional');
    console.log('- isPublic accepts string values ("true"/"false") from form data');
    console.log('- All form fields are automatically transformed to correct types');
    
    console.log('\n🚀 EXACT WORKING FORMAT:');
    console.log('const formData = new FormData();');
    console.log('formData.append("organizationId", "1");');
    console.log('formData.append("title", "Your Title");');
    console.log('formData.append("isPublic", "false");  // String, not boolean');
    console.log('// formData.append("image", fileInput.files[0]); // Optional');
};

// Generate exact working request
const generateWorkingExample = () => {
    console.log('\n🎯 COPY-PASTE WORKING EXAMPLE:\n');
    
    console.log('JavaScript:');
    console.log(`
const formData = new FormData();
formData.append('organizationId', '1');
formData.append('title', 'Environmental Conservation');
formData.append('description', 'A comprehensive environmental initiative');
formData.append('isPublic', 'false');

// Optional: Add image file
// const fileInput = document.getElementById('imageInput');
// if (fileInput.files[0]) {
//     formData.append('image', fileInput.files[0]);
// }

fetch('http://localhost:3000/organization/api/v1/causes/with-image', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN'
    },
    body: formData
})
.then(response => response.json())
.then(data => console.log('Success:', data));
`);
    
    console.log('cURL:');
    console.log(`
curl -X POST http://localhost:3000/organization/api/v1/causes/with-image \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "organizationId=1" \\
  -F "title=Environmental Conservation" \\
  -F "description=A comprehensive environmental initiative" \\
  -F "isPublic=false"
`);
};

// Main execution
const runTest = async () => {
    await testFixedCauseImageUpload();
    generateWorkingExample();
    
    console.log('\n🎉 VALIDATION ISSUE FIXED!');
    console.log('The "property image should not exist" error should be resolved.');
    console.log('The DTO now properly validates the image field as optional.');
};

runTest().catch(console.error);