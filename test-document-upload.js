const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function testDocumentUpload() {
  const form = new FormData();
  
  // Add form fields
  form.append('causeId', '7');
  form.append('title', 'Test Lecture with Document');
  form.append('description', 'Testing document upload with URL generation');
  form.append('venue', 'Online Platform');
  form.append('mode', 'online');
  form.append('timeStart', '2025-10-01T10:00:00.000Z');
  form.append('timeEnd', '2025-10-01T11:00:00.000Z');
  
  // Add a test document file
  form.append('documents', fs.createReadStream('./test-document.pdf'), {
    filename: 'test-document.pdf',
    contentType: 'application/pdf'
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
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', data);
        try {
          const parsed = JSON.parse(data);
          if (parsed.documents && parsed.documents.length > 0) {
            console.log('\n📄 Document URLs:');
            parsed.documents.forEach((doc, index) => {
              console.log(`${index + 1}. ${doc.title}: ${doc.url || 'NO URL GENERATED'}`);
            });
          }
        } catch (e) {
          console.log('Could not parse response as JSON');
        }
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      console.error('Request Error:', error);
      reject(error);
    });

    form.pipe(req);
  });
}

// Run the test
testDocumentUpload()
  .then(result => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });