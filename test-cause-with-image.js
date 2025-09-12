// 🖼️ CAUSE WITH IMAGE UPLOAD - WORKING TEST
// This tests the CORRECT endpoint for uploading causes with images

const testCauseWithImageUpload = async () => {
    console.log('🖼️ TESTING CAUSE WITH IMAGE UPLOAD\n');
    
    const baseURL = 'http://localhost:3000';
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your token
    
    console.log('🎯 Using CORRECT endpoint: /organization/api/v1/causes/with-image\n');
    
    // Test 1: Cause without image (using with-image endpoint)
    console.log('📋 Test 1: Cause without image (FormData format)');
    try {
        const formData1 = new FormData();
        formData1.append('organizationId', '1');
        formData1.append('title', 'Test Cause Without Image');
        formData1.append('description', 'Testing the with-image endpoint without actually uploading an image');
        formData1.append('isPublic', 'false');
        
        console.log('📤 Form Data Fields:');
        for (let [key, value] of formData1.entries()) {
            console.log(`   ${key}: ${value}`);
        }
        
        const response1 = await fetch(`${baseURL}/organization/api/v1/causes/with-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
                // Don't set Content-Type for FormData - browser sets it automatically
            },
            body: formData1
        });
        
        const result1 = await response1.json();
        
        console.log(`📈 Status: ${response1.status}`);
        if (response1.ok) {
            console.log('✅ SUCCESS!');
            console.log('📋 Cause ID:', result1.causeId);
            console.log('🖼️ Image URL:', result1.imageUrl || 'No image uploaded');
            console.log('📝 Title:', result1.title);
        } else {
            console.log('❌ ERROR:');
            if (result1.message && Array.isArray(result1.message)) {
                result1.message.forEach(msg => console.log(`   - ${msg}`));
            } else {
                console.log(`   - ${result1.message || 'Unknown error'}`);
            }
        }
    } catch (error) {
        console.log('🚨 Network Error:', error.message);
    }
    
    console.log('─'.repeat(70));
    
    // Test 2: Show how to add an actual image file
    console.log('\n📋 Test 2: How to add actual image file');
    console.log('📝 For browser environment:');
    console.log(`
    const fileInput = document.getElementById('imageInput');
    const formData = new FormData();
    formData.append('organizationId', '1');
    formData.append('title', 'Cause With Real Image');
    
    if (fileInput.files[0]) {
        formData.append('image', fileInput.files[0]);
        console.log('📎 Image file added:', fileInput.files[0].name);
    }
    `);
    
    console.log('📝 For Node.js environment:');
    console.log(`
    const fs = require('fs');
    const FormData = require('form-data');
    
    const form = new FormData();
    form.append('organizationId', '1');
    form.append('title', 'Cause With Real Image');
    form.append('image', fs.createReadStream('./image.jpg'));
    `);
    
    console.log('─'.repeat(70));
    
    console.log('\n💡 KEY DIFFERENCES:');
    console.log('❌ WRONG (what you were doing):');
    console.log('   - Endpoint: POST /organization/api/v1/causes');
    console.log('   - Content-Type: application/json');
    console.log('   - Body: {"organizationId": "1", "title": "Title"}');
    
    console.log('\n✅ CORRECT (for image upload):');
    console.log('   - Endpoint: POST /organization/api/v1/causes/with-image');
    console.log('   - Content-Type: multipart/form-data (set automatically)');
    console.log('   - Body: FormData with organizationId and title fields');
    
    console.log('\n🔧 QUICK FIX FOR YOUR CODE:');
    console.log('1. Change endpoint to: /organization/api/v1/causes/with-image');
    console.log('2. Use FormData instead of JSON:');
    console.log('   const formData = new FormData();');
    console.log('   formData.append("organizationId", "1");');
    console.log('   formData.append("title", "Your Cause Title");');
    console.log('3. Remove Content-Type header (let browser set it)');
    console.log('4. Send formData as body instead of JSON.stringify()');
};

// Generate exact cURL command
const generateCurlCommand = () => {
    console.log('\n🚀 EXACT cURL COMMAND (copy-paste ready):');
    console.log('Replace YOUR_JWT_TOKEN with your actual token:\n');
    
    const curlCommand = `curl -X POST http://localhost:3000/organization/api/v1/causes/with-image \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "organizationId=1" \\
  -F "title=Environmental Conservation Initiative" \\
  -F "description=A comprehensive environmental initiative" \\
  -F "isPublic=false"`;
    
    console.log(curlCommand);
    
    console.log('\n📎 To add an image file, append:');
    console.log('  -F "image=@/path/to/your/image.jpg"');
};

// Main execution
const runTest = async () => {
    await testCauseWithImageUpload();
    generateCurlCommand();
    
    console.log('\n🎯 SUMMARY:');
    console.log('Your validation error was because you were using the wrong endpoint!');
    console.log('Use /causes/with-image with FormData for image uploads.');
    console.log('Use /causes with JSON only for text-only causes.');
};

runTest().catch(console.error);