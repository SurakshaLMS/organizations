const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function testValidationFix() {
  console.log('\n🔧 TESTING VALIDATION FIX');
  console.log('═'.repeat(60));
  
  // Create a test PDF file
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Validation Test) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

  fs.writeFileSync('./validation-test.pdf', pdfContent);
  console.log('✅ Created validation test PDF file');

  const form = new FormData();
  
  // Add fields WITHOUT causeId (it should come from URL parameter only)
  form.append('title', 'Validation Test Lecture');
  form.append('description', 'Testing validation fix');
  form.append('venue', 'Online Validation');
  form.append('mode', 'online');
  form.append('timeStart', '2025-10-01T10:00:00.000Z');
  form.append('timeEnd', '2025-10-01T11:00:00.000Z');
  form.append('isPublic', 'false');
  
  // Add the document file
  form.append('documents', fs.createReadStream('./validation-test.pdf'), {
    filename: 'validation-test.pdf',
    contentType: 'application/pdf'
  });

  console.log('\n📋 Request Details:');
  console.log('Endpoint: POST /organization/api/v1/lectures/with-documents/7');
  console.log('causeId in URL: YES (as parameter)');
  console.log('causeId in body: NO (should not be included)');
  console.log('Fields in body:', {
    title: 'Validation Test Lecture',
    description: 'Testing validation fix',
    venue: 'Online Validation',
    mode: 'online',
    documents: 'validation-test.pdf'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/organization/api/v1/lectures/with-documents/7',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzIjoiNSIsImUiOiJoYXJpbmlAZ21haWwuY29tIiwibyI6WyJBNCIsIkE1IiwiTTYiXSwiaW5zIjpbIjEiXSwiaWF0IjoxNzU5MjI4MjY1LCJleHAiOjE3NTkzMTQ2NjV9.Uo6lTOAZuTi4hkwzkxJUVuxnqeZ5CG9GiQZWSPD2rPQ',
      ...form.getHeaders()
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`\n📊 Status Code: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('\n📄 Response:');
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
          
          // Analyze the response
          console.log('\n🔍 VALIDATION ANALYSIS:');
          if (res.statusCode === 400) {
            console.log('❌ VALIDATION FAILED');
            if (parsed.message && parsed.message.includes('causeId should not exist')) {
              console.log('   Issue: causeId validation conflict still exists');
              console.log('   Solution: Need to check validation pipe settings');
            } else if (parsed.message && Array.isArray(parsed.message)) {
              console.log('   Validation errors:');
              parsed.message.forEach(msg => console.log(`   - ${msg}`));
            }
          } else if (res.statusCode === 201) {
            console.log('✅ VALIDATION PASSED');
            if (parsed.documents && parsed.documents.length > 0) {
              console.log('✅ DOCUMENTS UPLOADED');
              parsed.documents.forEach((doc, index) => {
                console.log(`   ${index + 1}. ${doc.title}: ${doc.docUrl}`);
              });
            } else {
              console.log('⚠️ NO DOCUMENTS (possible GCS error)');
            }
          } else {
            console.log(`⚠️ UNEXPECTED STATUS: ${res.statusCode}`);
          }
          
        } catch (e) {
          console.log('Raw response (not JSON):');
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
testValidationFix()
  .then(result => {
    console.log('\n🎯 VALIDATION TEST COMPLETED');
    console.log('═'.repeat(60));
    
    // Clean up
    try {
      fs.unlinkSync('./validation-test.pdf');
      console.log('🧹 Cleaned up test file');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Validation test failed:', error);
    process.exit(1);
  });