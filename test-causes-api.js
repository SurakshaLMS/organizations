// Test causes API
console.log('Testing Causes API...');

// Test GET causes
fetch('http://localhost:3000/organization/api/v1/causes')
.then(response => response.json())
.then(data => {
  console.log('✅ GET /causes:', data);
})
.catch(error => {
  console.error('❌ GET /causes error:', error);
});

// Test POST cause
const newCause = {
  title: "Test Cause",
  description: "A test cause for testing",
  organizationId: "49" // Using the organization we created earlier
};

fetch('http://localhost:3000/organization/api/v1/causes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(newCause)
})
.then(response => response.json())
.then(data => {
  console.log('✅ POST /causes:', data);
})
.catch(error => {
  console.error('❌ POST /causes error:', error);
});
