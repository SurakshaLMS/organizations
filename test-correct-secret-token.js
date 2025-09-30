const jwt = require('jsonwebtoken');

// Use the same secret that the app uses
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

console.log('🔑 Using JWT secret:', JWT_SECRET.substring(0, 10) + '...');

// Your original token payload in ultra-compact format
const payload = {
  s: "5",                          // User ID
  e: "harini@gmail.com",          // Email
  o: ["A4", "A5"],                // Organizations: ADMIN in org 4 and 5
  ins: ["1"],                     // Institute IDs
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

console.log('\n📋 Token payload:');
console.log(JSON.stringify(payload, null, 2));

const token = jwt.sign(payload, JWT_SECRET);
console.log('\n🎯 Generated token:');
console.log(token);

// Verify the token
try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('\n✅ Token verification successful');
  console.log('Decoded payload:', JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('\n❌ Token verification failed:', error.message);
}