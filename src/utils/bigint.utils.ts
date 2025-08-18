/**
 * Utility functions for BigInt conversions
 * Optimized for production with simple numeric validation
 */

/**
 * Convert string ID to BigInt for database operations
 * @param id - Numeric string ID
 * @param fieldName - Field name for error messages (optional)
 * @returns BigInt for Prisma operations
 */
export function convertToBigInt(id: string, fieldName: string = 'ID'): bigint {
  if (!id || typeof id !== 'string') {
    throw new Error(`${fieldName} is required and must be a string`);
  }

  const trimmedId = id.trim();
  
  if (!trimmedId) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (!/^\d+$/.test(trimmedId)) {
    throw new Error(`${fieldName} must be a valid numeric string`);
  }

  if (trimmedId.length > 15) {
    throw new Error(`${fieldName} is too long (maximum 15 digits)`);
  }

  if (trimmedId.length > 1 && trimmedId.startsWith('0')) {
    throw new Error(`${fieldName} cannot have leading zeros`);
  }

  try {
    return BigInt(trimmedId);
  } catch (error) {
    throw new Error(`${fieldName} is not a valid number`);
  }
}

/**
 * Convert BigInt to string for JSON serialization
 * @param value - BigInt value
 * @returns String representation
 */
export function convertToString(value: bigint | number | string): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return String(value);
}
