import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * CUID Detection and Handling Interceptor
 * Detects CUID strings in requests and provides helpful error messages
 */
@Injectable()
export class CuidDetectionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Check for CUIDs in request parameters
    this.detectCuidsInRequest(request);
    
    return next.handle().pipe(
      catchError((error) => {
        // Enhance CUID-related errors with helpful information
        if (this.isCuidError(error)) {
          const enhancedError = this.enhanceCuidError(error, request);
          return throwError(() => enhancedError);
        }
        return throwError(() => error);
      }),
    );
  }

  private detectCuidsInRequest(request: any): void {
    // Check URL parameters
    if (request.params) {
      Object.entries(request.params).forEach(([key, value]) => {
        if (typeof value === 'string' && this.isCuid(value)) {
          console.warn(`🚨 CUID detected in URL parameter: ${key} = ${value}`);
          console.warn(`📍 Request: ${request.method} ${request.url}`);
          console.warn(`💡 This endpoint expects numeric BigInt IDs, not CUIDs`);
        }
      });
    }

    // Check query parameters
    if (request.query) {
      Object.entries(request.query).forEach(([key, value]) => {
        if (typeof value === 'string' && this.isCuid(value)) {
          console.warn(`🚨 CUID detected in query parameter: ${key} = ${value}`);
        }
      });
    }

    // Check request body
    if (request.body && typeof request.body === 'object') {
      this.detectCuidsInObject(request.body, 'request body');
    }
  }

  private detectCuidsInObject(obj: any, context: string): void {
    if (!obj || typeof obj !== 'object') return;

    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' && this.isCuid(value)) {
        console.warn(`🚨 CUID detected in ${context}: ${key} = ${value}`);
      } else if (typeof value === 'object' && value !== null) {
        this.detectCuidsInObject(value, `${context}.${key}`);
      }
    });
  }

  private isCuid(value: string): boolean {
    // CUID pattern: starts with 'c' followed by 24+ alphanumeric characters
    return /^c[a-z0-9]{24,}$/i.test(value);
  }

  private isCuidError(error: any): boolean {
    const message = error?.message || '';
    return (
      typeof message === 'string' &&
      (message.includes('Invalid ID format') || 
       message.includes('CUID') ||
       message.includes('Expected a numeric value'))
    );
  }

  private enhanceCuidError(error: any, request: any): BadRequestException {
    const originalMessage = error?.message || 'Invalid ID format';
    
    const enhancedMessage = {
      error: 'Invalid ID Format - CUID Detected',
      message: originalMessage,
      details: {
        issue: 'This endpoint expects MySQL auto-increment numeric IDs (BigInt), but received a CUID string',
        received: this.extractCuidFromMessage(originalMessage),
        expectedFormat: 'Numeric string (e.g., "1", "123", "456789")',
        receivedFormat: 'CUID string (e.g., "c123abc456def789")',
        request: {
          method: request.method,
          url: request.url,
          params: request.params,
        },
        suggestions: [
          '1. Verify you are calling the correct API endpoint',
          '2. Check if the ID should be converted from CUID to numeric before the request',
          '3. Ensure the frontend is using the correct ID format for this service',
          '4. Check if there is an ID mapping service that converts between CUID and numeric IDs'
        ],
        apiDocumentation: 'All IDs in this organization service are MySQL auto-increment integers (BigInt)',
      },
      timestamp: new Date().toISOString(),
    };

    return new BadRequestException(enhancedMessage);
  }

  private extractCuidFromMessage(message: string): string | null {
    const match = message.match(/c[a-z0-9]{24,}/i);
    return match ? match[0] : null;
  }
}
