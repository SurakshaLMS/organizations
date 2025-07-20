import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    
    // Set security headers
    response.header('X-Content-Type-Options', 'nosniff');
    response.header('X-Frame-Options', 'DENY');
    response.header('X-XSS-Protection', '1; mode=block');
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.header('Content-Security-Policy', "default-src 'self'");
    
    return next.handle().pipe(
      map(data => {
        // Remove sensitive fields from response
        if (data && typeof data === 'object') {
          return this.sanitizeResponse(data);
        }
        return data;
      })
    );
  }

  private sanitizeResponse(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = { ...data };
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'enrollmentKey', 'userAuth'];
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          delete sanitized[field];
        }
      });

      // Recursively sanitize nested objects
      Object.keys(sanitized).forEach(key => {
        if (sanitized[key] && typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitizeResponse(sanitized[key]);
        }
      });

      return sanitized;
    }

    return data;
  }
}
