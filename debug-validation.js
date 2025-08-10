#!/usr/bin/env node

// Simple test to reproduce the "ID must be numeric" error
// This will help us understand the exact error format

const testCases = [
  // Test the DTO validation
  { name: 'Valid numeric string', organizationId: "27", enrollmentKey: "CS2024" },
  { name: 'Invalid non-numeric string', organizationId: "abc", enrollmentKey: "CS2024" },
  { name: 'Number instead of string', organizationId: 27, enrollmentKey: "CS2024" },
  { name: 'Empty string', organizationId: "", enrollmentKey: "CS2024" },
  { name: 'Null value', organizationId: null, enrollmentKey: "CS2024" },
  { name: 'Undefined value', organizationId: undefined, enrollmentKey: "CS2024" }
];

console.log('🧪 Testing Organization ID Validation Patterns\n');

// Import validation functions to test locally
const isValidNumericString = (value) => {
  if (!value) return false;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^\d+$/.test(trimmed)) return false;
  return true;
};

const validateOrganizationId = (value) => {
  if (!value) {
    return { isValid: false, error: 'organizationId is required' };
  }
  
  if (typeof value !== 'string') {
    return { isValid: false, error: 'organizationId must be a string' };
  }
  
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, error: 'organizationId cannot be empty' };
  }
  
  if (!/^\d+$/.test(trimmed)) {
    return { isValid: false, error: 'organizationId must be a numeric string (e.g., "1", "123")' };
  }
  
  return { isValid: true, value: trimmed };
};

testCases.forEach((testCase, index) => {
  console.log(`📝 Test ${index + 1}: ${testCase.name}`);
  console.log(`   Input: organizationId = ${JSON.stringify(testCase.organizationId)} (type: ${typeof testCase.organizationId})`);
  
  const result = validateOrganizationId(testCase.organizationId);
  
  if (result.isValid) {
    console.log(`   ✅ Valid: "${result.value}"`);
  } else {
    console.log(`   ❌ Invalid: ${result.error}`);
  }
  console.log('');
});

console.log('🔍 Common Error Messages to Look For:');
console.log('   • "organizationId must be a numeric string"');
console.log('   • "ID must be numeric"');
console.log('   • "Invalid ID format"');
console.log('   • "Expected numeric value"');
console.log('');

console.log('💡 Solution Patterns:');
console.log('   • Ensure organizationId is sent as a string: "27"');
console.log('   • Not as a number: 27');
console.log('   • Not as non-numeric: "abc"');
console.log('   • Check request Content-Type: application/json');
console.log('   • Check DTO validation decorators');
