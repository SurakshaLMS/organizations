const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function testImageUpload() {
  const form = new FormData();
  
  // Add form fields
  form.append('title', 'Test Cause with Image');
  form.append('description', 'Testing image upload functionality');
  form.append('organizationId', '4');
  form.append('isPublic', 'false');
  
  // Add the image file
  form.append('image', fs.createReadStream('./test-image.txt'), {
    filename: 'test-image.txt',
    contentType: 'text/plain'
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
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Headers:', res.headers);
        console.log('Response Body:', data);
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
testImageUpload()
  .then(result => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });