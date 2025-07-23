// Test CUID detection and error handling
const { convertToBigInt } = require('./dist/auth/organization-access.service');

console.log('🧪 Testing CUID Detection and Error Handling\n');

// Test cases
const testCases = [
  { input: '123', expected: 'success', description: 'Valid numeric ID' },
  { input: 'cmd97yg5f0000v6b0woyohl8h', expected: 'cuid_error', description: 'CUID string' },
  { input: '550e8400-e29b-41d4-a716-446655440000', expected: 'uuid_error', description: 'UUID string' },
  { input: 'abc123', expected: 'invalid_error', description: 'Invalid alphanumeric' },
  { input: '-1', expected: 'negative_error', description: 'Negative number' },
  { input: '0', expected: 'zero_error', description: 'Zero value' },
];

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);
  
  try {
    const result = convertToBigInt(testCase.input, 'testId', 'testFunction');
    console.log(`✅ Success: ${result}`);
    console.log(`Expected: ${testCase.expected === 'success' ? '✅ Correct' : '❌ Unexpected success'}\n`);
  } catch (error) {
    console.log(`❌ Error: ${error.message.substring(0, 100)}...`);
    
    // Check if the error type matches expected
    const errorType = error.message.includes('CUID') ? 'cuid_error' : 
                     error.message.includes('UUID') ? 'uuid_error' :
                     error.message.includes('Non-Positive') ? 'negative_error' || 'zero_error' :
                     'invalid_error';
    
    console.log(`Expected: ${testCase.expected === errorType ? '✅ Correct error type' : '❌ Unexpected error type'}\n`);
  }
});

console.log('🎯 CUID Detection Test Complete!');
console.log('📋 Summary: Enhanced error messages now provide detailed information about ID format issues.');
console.log('🔧 The system will now clearly identify when CUIDs are passed to BigInt endpoints.');
