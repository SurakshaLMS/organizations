const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function debugDocumentUpload() {
  console.log('\n🔍 DEBUGGING DOCUMENT UPLOAD ISSUE');
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
(Test Document) Tj
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

  fs.writeFileSync('./debug-test.pdf', pdfContent);
  console.log('✅ Created debug PDF file');

  const form = new FormData();
  
  // Add all required fields
  form.append('title', 'Debug Test Lecture');
  form.append('description', 'Debugging document upload');
  form.append('venue', 'Online Debug');
  form.append('mode', 'online');
  form.append('timeStart', '2025-10-01T10:00:00.000Z');
  form.append('timeEnd', '2025-10-01T11:00:00.000Z');
  form.append('isPublic', 'false');
  
  // Add the document file
  form.append('documents', fs.createReadStream('./debug-test.pdf'), {
    filename: 'debug-test.pdf',
    contentType: 'application/pdf'
  });

  console.log('\n📋 Request Details:');
  console.log('Endpoint: POST /organization/api/v1/lectures/with-documents/7');
  console.log('Content-Type: multipart/form-data');
  console.log('Fields:', {
    title: 'Debug Test Lecture',
    description: 'Debugging document upload',
    venue: 'Online Debug',
    mode: 'online',
    documents: 'debug-test.pdf (PDF file)'
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
          console.log('\n🔍 ANALYSIS:');
          if (parsed.documents && parsed.documents.length > 0) {
            console.log('✅ SUCCESS: Documents were uploaded!');
            parsed.documents.forEach((doc, index) => {
              console.log(`   ${index + 1}. ${doc.title}: ${doc.docUrl}`);
            });
          } else {
            console.log('❌ ISSUE: No documents in response');
            console.log('   This could be due to:');
            console.log('   • File type not supported');
            console.log('   • File upload failed silently');
            console.log('   • Server-side validation error');
            console.log('   • GCS upload failure');
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

// Run the debug test
debugDocumentUpload()
  .then(result => {
    console.log('\n🎯 DEBUG TEST COMPLETED');
    console.log('═'.repeat(60));
    
    // Clean up
    try {
      fs.unlinkSync('./debug-test.pdf');
      console.log('🧹 Cleaned up debug file');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug test failed:', error);
    process.exit(1);
  });