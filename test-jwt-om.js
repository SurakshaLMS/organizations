const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzIjoiNSIsInV0IjoiT00iLCJpYXQiOjE3NTczNDc0ODIsImFhIjp7IjEiOjF9LCJleHAiOjE3NTc0MzM4ODJ9.xONkFqa0AvsuOGV-rxfr6sW3NM3Ef4YCchfr7g_u5qA';

try {
  // Decode without verification to see payload
  const decoded = jwt.decode(token);
  console.log('JWT Payload:', JSON.stringify(decoded, null, 2));
  
  // Try to verify with the JWT secret
  const secret = 'your-super-secret-jwt-key-change-this-in-production';
  try {
    const verified = jwt.verify(token, secret);
    console.log('✅ JWT Verification successful:', JSON.stringify(verified, null, 2));
  } catch (verifyError) {
    console.log('❌ JWT Verification failed:', verifyError.message);
  }
  
} catch (error) {
  console.log('Error decoding JWT:', error.message);
}
