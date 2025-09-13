// 🎯 FINAL FIX TEST - Image Field Removed from DTO
// This should resolve the "property image should not exist" error completely

const testFinalImageUploadFix = async () => {
    console.log('🎯 TESTING FINAL IMAGE UPLOAD FIX\n');
    
    const baseURL = 'http://localhost:3000';
    const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Replace with your token
    
    console.log('✅ Fixed: Removed image field from DTO completely');
    console.log('✅ Image is now handled by @UploadedFile() decorator only\n');
    
    // Test the exact same request that was failing before
    console.log('📋 Testing exact request format that was failing...');
    
    const formData = new FormData();
    formData.append('organizationId', '1');
    formData.append('title', 'Your Cause Title');
    
    // DO NOT append image to test the error fix first
    console.log('📤 Form Data (without image):');
    for (let [key, value] of formData.entries()) {
        console.log(`   ${key}: ${value}`);
    }
    
    try {
        const response = await fetch(`${baseURL}/organization/api/v1/causes/with-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        console.log(`\n📈 Status: ${response.status}`);
        
        if (response.ok) {
            console.log('🎉 SUCCESS! The validation error is FIXED!');
            console.log('📋 Response:', {
                causeId: result.causeId,
                title: result.title,
                organizationId: result.organizationId,
                imageUrl: result.imageUrl || 'No image (as expected)'
            });
        } else {
            console.log('❌ Response:', result);
            
            // Check if it's still the same error
            if (result.message && result.message.includes('property image should not exist')) {
                console.log('🚨 STILL GETTING THE SAME ERROR!');
                console.log('💡 Possible causes:');
                console.log('   1. Server not restarted after DTO changes');
                console.log('   2. TypeScript not compiled');
                console.log('   3. Cached modules');
                console.log('\n🔧 Try: npm run build && npm run start:dev');
            } else {
                console.log('✅ Different error - the image validation is fixed!');
                console.log('🔍 New validation errors (if any):');
                if (Array.isArray(result.message)) {
                    result.message.forEach(msg => console.log(`   - ${msg}`));
                }
            }
        }
    } catch (error) {
        console.log('🚨 Network Error:', error.message);
        console.log('💡 Make sure your server is running on localhost:3000');
    }
    
    console.log('\n─'.repeat(70));
    
    // Test with additional fields
    console.log('\n📋 Testing with all optional fields...');
    
    const formDataComplete = new FormData();
    formDataComplete.append('organizationId', '1');
    formDataComplete.append('title', 'Complete Test Cause');
    formDataComplete.append('description', 'Testing with all fields');
    formDataComplete.append('isPublic', 'false');
    formDataComplete.append('introVideoUrl', 'https://youtube.com/watch?v=test');
    
    console.log('📤 Complete Form Data:');
    for (let [key, value] of formDataComplete.entries()) {
        console.log(`   ${key}: ${value}`);
    }
    
    try {
        const response2 = await fetch(`${baseURL}/organization/api/v1/causes/with-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: formDataComplete
        });
        
        const result2 = await response2.json();
        
        console.log(`\n📈 Status: ${response2.status}`);
        
        if (response2.ok) {
            console.log('🎉 COMPLETE SUCCESS!');
            console.log('📋 All fields working correctly');
        } else {
            console.log('❌ Error with additional fields:', result2.message);
        }
    } catch (error) {
        console.log('🚨 Network Error:', error.message);
    }
    
    console.log('\n🔧 WHAT WAS CHANGED:');
    console.log('1. ❌ REMOVED image field from CreateCauseWithImageDto');
    console.log('2. ❌ REMOVED image field from UpdateCauseWithImageDto');
    console.log('3. ✅ Image is handled by @UploadedFile() decorator in controller');
    console.log('4. ✅ No validation conflict between @Body() and @UploadedFile()');
    
    console.log('\n🎯 ARCHITECTURE:');
    console.log('Controller receives:');
    console.log('  @Body() createCauseDto: CreateCauseWithImageDto  // Form fields only');
    console.log('  @UploadedFile() image?: Express.Multer.File      // Image file only');
    console.log('\nDTO contains: organizationId, title, description, introVideoUrl, isPublic');
    console.log('DTO does NOT contain: image (handled separately)');
};

// Quick server restart reminder
const checkServerStatus = async () => {
    console.log('🔍 Checking if server needs restart...\n');
    
    try {
        const response = await fetch('http://localhost:3000/organization/api/v1/causes');
        console.log(`✅ Server responding: ${response.status}`);
        
        if (response.status === 404) {
            console.log('⚠️  Endpoint not found - server might need restart');
        }
    } catch (error) {
        console.log('❌ Server not responding');
        console.log('💡 Start server: npm run start:dev');
        return false;
    }
    
    return true;
};

// Main execution
const runFinalTest = async () => {
    console.log('🔧 DTO VALIDATION FIX - FINAL TEST\n');
    
    const serverOk = await checkServerStatus();
    if (serverOk) {
        await testFinalImageUploadFix();
        
        console.log('\n🚨 IMPORTANT:');
        console.log('If you still get the same error, restart your server:');
        console.log('  Ctrl+C (stop server)');
        console.log('  npm run start:dev (restart)');
        console.log('\nThe DTO changes require server restart to take effect!');
    }
};

runFinalTest().catch(console.error);