#!/usr/bin/env node

/**
 * ORGANIZATION ENROLLMENT API - WORKING EXAMPLES
 * 
 * This file demonstrates the correct way to use the enrollment API
 * and shows common mistakes that cause "ID must be numeric" errors.
 */

console.log('🏛️  ORGANIZATION ENROLLMENT API - WORKING EXAMPLES\n');

console.log('✅ CORRECT USAGE:');
console.log('');

console.log('1. Enrollment Request (CORRECT):');
console.log('POST /organization/api/v1/organizations/enroll');
console.log('Content-Type: application/json');
console.log('Authorization: Bearer YOUR_JWT_TOKEN');
console.log('');
console.log(JSON.stringify({
  organizationId: "27",        // ✅ STRING (correct)
  enrollmentKey: "CS2024"
}, null, 2));
console.log('');

console.log('2. User Verification Request (CORRECT):');
console.log('PUT /organization/api/v1/organizations/27/verify');
console.log('Content-Type: application/json');
console.log('Authorization: Bearer YOUR_JWT_TOKEN');
console.log('');
console.log(JSON.stringify({
  userId: "15",               // ✅ STRING (correct)
  isVerified: true
}, null, 2));
console.log('');

console.log('❌ COMMON MISTAKES THAT CAUSE ERRORS:');
console.log('');

console.log('1. Sending organizationId as NUMBER (WRONG):');
console.log(JSON.stringify({
  organizationId: 27,         // ❌ NUMBER - causes "must be a string" error
  enrollmentKey: "CS2024"
}, null, 2));
console.log('');

console.log('2. Sending organizationId as NON-NUMERIC STRING (WRONG):');
console.log(JSON.stringify({
  organizationId: "abc",      // ❌ NON-NUMERIC - causes "must be numeric string" error
  enrollmentKey: "CS2024"
}, null, 2));
console.log('');

console.log('3. Missing organizationId (WRONG):');
console.log(JSON.stringify({
  // organizationId: missing  // ❌ MISSING - causes "is required" error
  enrollmentKey: "CS2024"
}, null, 2));
console.log('');

console.log('4. Empty organizationId (WRONG):');
console.log(JSON.stringify({
  organizationId: "",         // ❌ EMPTY - causes "is required" error
  enrollmentKey: "CS2024"
}, null, 2));
console.log('');

console.log('🔧 TROUBLESHOOTING GUIDE:');
console.log('');
console.log('If you get "organizationId must be a string" error:');
console.log('  → Change: organizationId: 27');
console.log('  → To:     organizationId: "27"');
console.log('');
console.log('If you get "organizationId must be a numeric string" error:');
console.log('  → Change: organizationId: "abc"');
console.log('  → To:     organizationId: "123"');
console.log('');
console.log('If you get "organizationId is required" error:');
console.log('  → Make sure to include organizationId in your request body');
console.log('  → Check that it\'s not null, undefined, or empty string');
console.log('');

console.log('📖 API DOCUMENTATION:');
console.log('');
console.log('Complete API docs available at:');
console.log('http://localhost:3003/organization/api/v1/docs');
console.log('');
console.log('Enrollment endpoint:');
console.log('POST /organization/api/v1/organizations/enroll');
console.log('');
console.log('Expected request format:');
console.log('{');
console.log('  "organizationId": "123",     // Must be string of digits');
console.log('  "enrollmentKey": "OPTIONAL"  // String, only for private orgs');
console.log('}');
console.log('');

console.log('🎯 QUICK FIX CHECKLIST:');
console.log('');
console.log('□ organizationId is a string (wrapped in quotes)');
console.log('□ organizationId contains only digits (0-9)');
console.log('□ organizationId is not empty');
console.log('□ Content-Type header is application/json');
console.log('□ Request body is valid JSON');
console.log('□ Authorization header includes valid JWT token');
console.log('');

console.log('💡 EXAMPLE CURL COMMAND:');
console.log('');
console.log('curl -X POST http://localhost:3003/organization/api/v1/organizations/enroll \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\');
console.log('  -d \'{"organizationId": "27", "enrollmentKey": "CS2024"}\'');
console.log('');
