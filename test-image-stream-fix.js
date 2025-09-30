const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

// Create a valid test image file
function createTestImageFile() {
  // Create a minimal valid JPEG file
  const jpegHeader = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F
  ]);
  
  const jpegFooter = Buffer.from([0xFF, 0xD9]);
  const jpegData = Buffer.concat([jpegHeader, jpegFooter]);
  
  fs.writeFileSync('./test-stream-fix-image.jpg', jpegData);
  console.log('✅ Created test JPEG file');
}

async function testImageStreamFix() {
  console.log('\n🔧 TESTING IMAGE STREAM FIX');
  console.log('═'.repeat(60));
  
  // Create test image
  createTestImageFile();
  
  const form = new FormData();
  
  // Add form fields
  form.append('title', 'Stream Fix Test 2');
  form.append('description', 'Testing if stream error is fixed');
  form.append('organizationId', '4');
  form.append('isPublic', 'false');
  
  // Add the test image file
  form.append('image', fs.createReadStream('./test-stream-fix-image.jpg'), {
    filename: 'test-stream-fix-image.jpg',
    contentType: 'image/jpeg'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/organization/api/v1/causes/with-image',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzIjoiNSIsImUiOiJoYXJpbmlAZ21haWwuY29tIiwibyI6WyJBNCIsIkE1IiwiTTYiXSwiaW5zIjpbIjEiXSwiaWF0IjoxNzU5MjI4MjY1LCJleHAiOjE3NTkzMTQ2NjV9.Uo6lTOAZuTi4hkwzkxJUVuxnqeZ5CG9GiQZWSPD2rPQ',
      ...form.getHeaders()
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`📄 Response:`, JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 201) {
            console.log('\n✅ SUCCESS: Image uploaded successfully!');
            if (jsonData.data && jsonData.data.imageUrl) {
              console.log(`🖼️ Image URL: ${jsonData.data.imageUrl}`);
            }
          } else if (res.statusCode === 500) {
            console.log('\n❌ STREAM ERROR STILL EXISTS:');
            console.log(`Error: ${jsonData.message}`);
            if (jsonData.message.includes('stream was destroyed')) {
              console.log('🚨 Stream fix needs more work!');
            } else if (jsonData.message.includes('DECODER')) {
              console.log('🔑 This is a GCS credentials issue (DECODER error)');
            }
          } else {
            console.log('\n⚠️ UNEXPECTED RESPONSE');
          }
          
        } catch (e) {
          console.log('\n📝 Raw Response (not JSON):');
          console.log(data);
        }
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(error);
    });

    form.pipe(req);
  });
}

// Run the test
testImageStreamFix()
  .then(result => {
    console.log('\n🎯 IMAGE STREAM TEST COMPLETED');
    console.log('═'.repeat(60));
    
    // Clean up test file
    try {
      fs.unlinkSync('./test-stream-fix-image.jpg');
      console.log('🧹 Cleaned up test image file');
    } catch (e) {
      console.log('ℹ️ Test image file cleanup skipped');
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });