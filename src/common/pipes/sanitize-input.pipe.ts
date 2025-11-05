import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * ✅ SECURITY: Input Sanitization Pipe
 * - Prevents XSS attacks by sanitizing HTML/script tags
 * - Validates input length to prevent DoS
 * - Removes dangerous characters
 * - Prevents SQL injection patterns
 */
@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  private readonly maxLength = 10000; // Prevent extremely long inputs

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      return value;
    }

    // Handle objects recursively
    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.transform(item, metadata));
    }

    // Handle strings
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    return value;
  }

  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Validate key names (prevent prototype pollution)
      if (this.isDangerousKey(key)) {
        throw new BadRequestException(`Invalid property name: ${key}`);
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = Array.isArray(value) 
          ? value.map(item => typeof item === 'string' ? this.sanitizeString(item) : item)
          : this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeString(value: string): string {
    if (!value || typeof value !== 'string') {
      return value;
    }

    // Check length to prevent DoS
    if (value.length > this.maxLength) {
      throw new BadRequestException(`Input too long. Maximum ${this.maxLength} characters allowed`);
    }

    let sanitized = value;

    // ✅ SECURITY: Remove dangerous HTML/Script tags
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, ''); // Remove onclick, onerror, etc.

    // ✅ SECURITY: Detect SQL injection patterns
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bEXEC\b.*\()/i,
      /(;.*--)/,
      /('.*OR.*'.*=.*')/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException('Invalid input detected');
      }
    }

    // ✅ SECURITY: Remove null bytes (can bypass filters)
    sanitized = sanitized.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * ✅ SECURITY: Prevent prototype pollution
   */
  private isDangerousKey(key: string): boolean {
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    return dangerousKeys.includes(key.toLowerCase());
  }
}
