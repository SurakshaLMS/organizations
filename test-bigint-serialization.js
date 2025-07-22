/**
 * Test script to verify BigInt serialization is working properly
 */

// Apply the global BigInt serialization fix
BigInt.prototype.toJSON = function() {
  return this.toString();
};

// Test the global BigInt toJSON fix
console.log('🧪 Testing BigInt serialization fixes...\n');

// Test 1: Direct BigInt serialization
console.log('1. Direct BigInt serialization:');
const testBigInt = BigInt('12345678901234567890');
console.log('BigInt value:', testBigInt);
console.log('JSON.stringify result:', JSON.stringify(testBigInt));

// Test 2: Object with BigInt properties
console.log('\n2. Object with BigInt properties:');
const testObject = {
  id: BigInt('123'),
  name: 'Test Object',
  nested: {
    bigIntId: BigInt('456'),
    regularField: 'regular'
  }
};
console.log('Object:', testObject);
console.log('JSON.stringify result:', JSON.stringify(testObject));

// Test 3: Array with BigInt values
console.log('\n3. Array with BigInt values:');
const testArray = [BigInt('111'), BigInt('222'), 'string', { id: BigInt('333') }];
console.log('Array:', testArray);
console.log('JSON.stringify result:', JSON.stringify(testArray));

// Test 4: Custom replacer function (like our interceptors use)
console.log('\n4. Custom replacer function:');
const customReplacer = (key, value) => {
  return typeof value === 'bigint' ? value.toString() : value;
};
const testWithReplacer = JSON.stringify(testObject, customReplacer);
console.log('With custom replacer:', testWithReplacer);

console.log('\n✅ All BigInt serialization tests completed!');
