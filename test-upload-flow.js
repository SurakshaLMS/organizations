/**
 * Test Signed URL Upload Flow
 * 
 * Run: node test-upload-flow.js
 */

const API_BASE = 'http://localhost:8080';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Get from login endpoint

async function testSignedUrlFlow() {
  console.log('🚀 Testing Signed URL Upload Flow...\n');

  try {
    // Step 1: Request Signed URL
    console.log('📝 Step 1: Requesting signed URL...');
    const signedUrlResponse = await fetch(`${API_BASE}/signed-urls/organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        instituteId: '123',
        fileExtension: '.jpg',
      }),
    });

    if (!signedUrlResponse.ok) {
      throw new Error(`Failed to get signed URL: ${signedUrlResponse.status}`);
    }

    const signedUrlData = await signedUrlResponse.json();
    console.log('✅ Signed URL generated:', {
      uploadToken: signedUrlData.uploadToken.substring(0, 50) + '...',
      expiresIn: `${signedUrlData.expiresIn} seconds`,
      maxSize: `${signedUrlData.maxFileSizeBytes / 1024 / 1024} MB`,
    });

    // Step 2: Simulate file upload (you need actual file in browser/Node with fs)
    console.log('\n📤 Step 2: Upload file to GCS...');
    console.log('   Use this URL:', signedUrlData.signedUrl.substring(0, 80) + '...');
    console.log('   Upload your file using PUT request with Content-Type: image/jpeg');
    console.log('   Example: curl -X PUT "{URL}" -H "Content-Type: image/jpeg" --data-binary "@image.jpg"');

    // For demo, we'll skip actual upload and continue to verification
    console.log('\n⏩ Skipping actual upload (requires binary file)...\n');

    // Step 3: Verify upload (would fail if file not actually uploaded)
    console.log('🔍 Step 3: Verifying upload...');
    console.log('   (This will fail without actual file upload - that\'s expected)');
    
    const verifyResponse = await fetch(
      `${API_BASE}/signed-urls/verify/${encodeURIComponent(signedUrlData.uploadToken)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
        },
      }
    );

    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      console.log('✅ Verification successful!');
      console.log('   Public URL:', verifyData.publicUrl);
      console.log('   Relative Path:', verifyData.relativePath);
    } else {
      console.log('⚠️  Verification failed (expected - no actual file uploaded)');
      console.log('   Message:', verifyData.message);
    }

    console.log('\n✅ Flow test complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Get JWT token from /auth/login');
    console.log('   2. Replace JWT_TOKEN in this script');
    console.log('   3. Upload actual file to signed URL');
    console.log('   4. Call verify endpoint');
    console.log('   5. Use returned publicUrl in create/update endpoints');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test
if (JWT_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
  console.log('⚠️  Please set JWT_TOKEN in the script first!');
  console.log('   Get token from: POST http://localhost:8080/auth/login');
} else {
  testSignedUrlFlow();
}
