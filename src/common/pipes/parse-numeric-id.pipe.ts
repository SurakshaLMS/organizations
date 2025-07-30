import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * NUMERIC ID VALIDATION PIPE (For BigInt Database IDs)
 * 
 * Validates and transforms numeric string IDs for MySQL auto-increment BigInt fields
 * Used for organization IDs, institute IDs, user IDs, etc.
 */
@Injectable()
export class ParseNumericIdPipe implements PipeTransform<string, string> {
  constructor(private readonly fieldName: string = 'ID') {}

  transform(value: string): string {
    // Check if value exists
    if (!value) {
      throw new BadRequestException(`${this.fieldName} is required`);
    }

    // Check if value is a string
    if (typeof value !== 'string') {
      throw new BadRequestException(`${this.fieldName} must be a string`);
    }

    // Trim whitespace
    const trimmedValue = value.trim();

    // Check if empty after trimming
    if (!trimmedValue) {
      throw new BadRequestException(`${this.fieldName} cannot be empty`);
    }

    // Validate numeric format (only digits)
    if (!/^\d+$/.test(trimmedValue)) {
      throw new BadRequestException(`${this.fieldName} must be a valid numeric string (e.g., "1", "123", "456")`);
    }

    // Check for reasonable length (prevent overflow)
    if (trimmedValue.length > 15) {
      throw new BadRequestException(`${this.fieldName} is too long (maximum 15 digits)`);
    }

    // Check for leading zeros (except single "0")
    if (trimmedValue.length > 1 && trimmedValue.startsWith('0')) {
      throw new BadRequestException(`${this.fieldName} cannot have leading zeros`);
    }

    // Validate that it can be converted to BigInt (additional safety)
    try {
      BigInt(trimmedValue);
    } catch (error) {
      throw new BadRequestException(`${this.fieldName} is not a valid number`);
    }

    return trimmedValue;
  }
}

/**
 * Pre-configured pipes for common ID types
 */
export const ParseOrganizationIdPipe = () => new ParseNumericIdPipe('Organization ID');
export const ParseInstituteIdPipe = () => new ParseNumericIdPipe('Institute ID');
export const ParseUserIdPipe = () => new ParseNumericIdPipe('User ID');
export const ParseCauseIdPipe = () => new ParseNumericIdPipe('Cause ID');
export const ParseLectureIdPipe = () => new ParseNumericIdPipe('Lecture ID');
