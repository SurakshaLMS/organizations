import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityHeadersInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();
    
    // Generate unique request ID for tracking
    const requestId = this.generateRequestId();
    request.requestId = requestId;
    
    // Log incoming request
    this.logIncomingRequest(request, requestId);
    
    // Set security headers
    response.header('X-Content-Type-Options', 'nosniff');
    response.header('X-Frame-Options', 'DENY');
    response.header('X-XSS-Protection', '1; mode=block');
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.header('Content-Security-Policy', "default-src 'self'");
    response.header('X-Request-ID', requestId);
    
    return next.handle().pipe(
      map(data => {
        // Remove sensitive fields from response
        if (data && typeof data === 'object') {
          return this.sanitizeResponse(data);
        }
        return data;
      }),
      tap(data => {
        // Log successful response
        const duration = Date.now() - startTime;
        this.logOutgoingResponse(request, response, data, duration, requestId, 'SUCCESS');
      }),
      catchError(error => {
        // Log error response
        const duration = Date.now() - startTime;
        this.logOutgoingResponse(request, response, null, duration, requestId, 'ERROR', error);
        return throwError(() => error);
      })
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logIncomingRequest(request: any, requestId: string): void {
    const { method, url, headers, body, query, params, ip } = request;
    
    // Extract useful headers for security monitoring
    const relevantHeaders = {
      'user-agent': headers['user-agent'],
      'origin': headers['origin'],
      'referer': headers['referer'],
      'x-forwarded-for': headers['x-forwarded-for'],
      'x-real-ip': headers['x-real-ip'],
      'authorization': headers['authorization'] ? '[REDACTED]' : undefined,
      'content-type': headers['content-type'],
      'content-length': headers['content-length'],
      'ngrok-skip-browser-warning': headers['ngrok-skip-browser-warning']
    };

    // Remove undefined values
    Object.keys(relevantHeaders).forEach(key => {
      if (relevantHeaders[key] === undefined) {
        delete relevantHeaders[key];
      }
    });

    const logData = {
      type: 'INCOMING_REQUEST',
      requestId,
      timestamp: new Date().toISOString(),
      method,
      url,
      clientIp: ip || headers['x-forwarded-for'] || headers['x-real-ip'],
      headers: relevantHeaders,
      query: Object.keys(query).length > 0 ? query : undefined,
      params: Object.keys(params).length > 0 ? params : undefined,
      body: this.sanitizeRequestBody(body),
      userAgent: headers['user-agent']
    };

    // Remove undefined values
    Object.keys(logData).forEach(key => {
      if (logData[key] === undefined) {
        delete logData[key];
      }
    });

    this.logger.log(`📥 INCOMING: ${method} ${url} | IP: ${logData.clientIp} | ID: ${requestId}`);
    this.logger.debug(`📥 REQUEST DETAILS: ${JSON.stringify(logData, null, 2)}`);
  }

  private logOutgoingResponse(
    request: any,
    response: any,
    data: any,
    duration: number,
    requestId: string,
    status: 'SUCCESS' | 'ERROR',
    error?: any
  ): void {
    const { method, url } = request;
    const statusCode = response.statusCode;

    const logData = {
      type: 'OUTGOING_RESPONSE',
      requestId,
      timestamp: new Date().toISOString(),
      method,
      url,
      statusCode,
      status,
      duration: `${duration}ms`,
      responseSize: data ? JSON.stringify(data).length : 0,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    };

    // Log level based on status and response time
    const logLevel = this.determineLogLevel(statusCode, duration, status);
    const statusEmoji = this.getStatusEmoji(statusCode, status);
    const durationColor = duration > 1000 ? '🐌' : duration > 500 ? '⚠️' : '⚡';

    const summary = `${statusEmoji} OUTGOING: ${method} ${url} | ${statusCode} | ${duration}ms ${durationColor} | ID: ${requestId}`;

    switch (logLevel) {
      case 'error':
        this.logger.error(summary);
        this.logger.error(`📤 ERROR DETAILS: ${JSON.stringify(logData, null, 2)}`);
        break;
      case 'warn':
        this.logger.warn(summary);
        this.logger.debug(`📤 RESPONSE DETAILS: ${JSON.stringify(logData, null, 2)}`);
        break;
      case 'log':
      default:
        this.logger.log(summary);
        this.logger.debug(`📤 RESPONSE DETAILS: ${JSON.stringify(logData, null, 2)}`);
        break;
    }

    // Log response data for debugging (only in debug mode)
    if (data && status === 'SUCCESS') {
      this.logger.debug(`📤 RESPONSE DATA: ${JSON.stringify(this.sanitizeResponseForLogging(data), null, 2)}`);
    }
  }

  private determineLogLevel(statusCode: number, duration: number, status: 'SUCCESS' | 'ERROR'): 'log' | 'warn' | 'error' {
    if (status === 'ERROR' || statusCode >= 500) {
      return 'error';
    }
    if (statusCode >= 400 || duration > 2000) {
      return 'warn';
    }
    return 'log';
  }

  private getStatusEmoji(statusCode: number, status: 'SUCCESS' | 'ERROR'): string {
    if (status === 'ERROR' || statusCode >= 500) return '❌';
    if (statusCode >= 400) return '⚠️';
    if (statusCode >= 300) return '🔄';
    if (statusCode >= 200) return '✅';
    return '📡';
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remove sensitive fields from request body
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'enrollmentKey', 'userAuth', 'privateKey', 'apiKey'
    ];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private sanitizeResponseForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // For logging, limit the response data to prevent huge logs
    const stringified = JSON.stringify(data);
    if (stringified.length > 1000) {
      return `[LARGE_RESPONSE: ${stringified.length} characters]`;
    }

    // For logging purposes, redact ALL sensitive fields including tokens
    return this.sanitizeForLogging(data);
  }

  private sanitizeForLogging(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle BigInt conversion for JSON serialization
    if (typeof data === 'bigint') {
      return data.toString();
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }

    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          
          // For logging, redact ALL sensitive fields including tokens
          if (this.isSensitiveField(key)) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof value === 'bigint') {
            sanitized[key] = value.toString();
          } else if (value !== null && typeof value === 'object') {
            sanitized[key] = this.sanitizeForLogging(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      
      return sanitized;
    }

    return data;
  }

  private sanitizeResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle BigInt conversion for JSON serialization
    if (typeof data === 'bigint') {
      return data.toString();
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeResponse(item));
    }

    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          
          // Don't redact tokens in login/auth responses - they need to be sent to frontend
          if (this.isSensitiveField(key) && !this.isAuthTokenField(key)) {
            sanitized[key] = '[REDACTED]';
          } else if (typeof value === 'bigint') {
            sanitized[key] = value.toString();
          } else if (value !== null && typeof value === 'object') {
            sanitized[key] = this.sanitizeResponse(value);
          } else {
            sanitized[key] = value;
          }
        }
      }
      
      return sanitized;
    }

    return data;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'auth', 'authorization',
      'enrollmentKey', 'userAuth', 'privateKey', 'apiKey', 'accessToken',
      'refreshToken', 'sessionToken', 'otp', 'pin', 'ssn', 'creditCard'
    ];
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private isAuthTokenField(fieldName: string): boolean {
    // These token fields should NOT be redacted in responses as they need to be sent to frontend
    const authTokenFields = ['accessToken', 'refreshToken'];
    return authTokenFields.includes(fieldName);
  }
}
