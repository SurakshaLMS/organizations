import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Global BigInt Serialization Interceptor
 * Ensures all BigInt values are properly converted to strings in API responses
 * Handles nested objects, arrays, and complex data structures
 */
@Injectable()
export class BigIntSerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.sanitizeBigInt(data)),
    );
  }

  /**
   * Recursively sanitizes BigInt values in any data structure
   * @param data - The data to sanitize
   * @returns - Data with BigInt values converted to strings
   */
  private sanitizeBigInt(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle BigInt directly
    if (typeof data === 'bigint') {
      return data.toString();
    }

    // Handle Arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeBigInt(item));
    }

    // Handle Objects (including nested objects)
    if (data && typeof data === 'object') {
      // Handle special cases like Date objects
      if (data instanceof Date) {
        return data;
      }

      // Handle regular objects
      const sanitized: any = {};
      Object.keys(data).forEach(key => {
        sanitized[key] = this.sanitizeBigInt(data[key]);
      });
      return sanitized;
    }

    // Handle primitives (string, number, boolean)
    return data;
  }
}
