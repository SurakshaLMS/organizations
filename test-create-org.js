// Test organization creation API
const testData = {
  name: "Another Test Organization",
  type: "GLOBAL",
  isPublic: false,
  enrollmentKey: "SECRET123"
};

fetch('http://localhost:3000/organization/api/v1/organizations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Organization created successfully:', data);
})
.catch(error => {
  console.error('❌ Error creating organization:', error);
});
