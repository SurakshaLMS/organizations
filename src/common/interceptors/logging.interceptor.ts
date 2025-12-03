import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * GLOBAL LOGGING INTERCEPTOR
 * 
 * Logs all incoming requests and outgoing responses globally
 * - Request: Method, URL, Headers, Body (for development)
 * - Response: Status Code, Response Time, Response Size
 * - Conditionally logs request body based on environment
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isDevelopment = process.env.NODE_ENV === 'development';

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const origin = headers.origin || headers.referer || 'Direct';
    const contentType = headers['content-type'] || 'none';
    
    const startTime = Date.now();

    // Log incoming request
    this.logger.log(
      `→ ${method} ${url} | Origin: ${origin} | UA: ${userAgent.substring(0, 50)}...`
    );

    // Log request details in development
    if (this.isDevelopment) {
      this.logger.debug(`  Headers: ${JSON.stringify({
        'content-type': contentType,
        'authorization': headers.authorization ? 'Bearer ***' : 'none',
        'origin': origin,
      })}`);

      // Log body for non-GET requests (excluding sensitive data)
      if (method !== 'GET' && body && Object.keys(body).length > 0) {
        const sanitizedBody = this.sanitizeBody(body);
        this.logger.debug(`  Body: ${JSON.stringify(sanitizedBody)}`);
      }
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          const responseSize = JSON.stringify(data || {}).length;

          // Log successful response
          this.logger.log(
            `← ${method} ${url} | ${statusCode} | ${duration}ms | ${this.formatBytes(responseSize)}`
          );

          // Log response data in development
          if (this.isDevelopment && data) {
            // For debugging URL transformation, show full response
            const fullResponse = JSON.stringify(data, null, 2);
            
            // If response is small, show full content
            if (fullResponse.length <= 1000) {
              this.logger.debug(`  Full Response:\n${fullResponse}`);
            } else {
              // For large responses, show preview
              const preview = this.getResponsePreview(data);
              if (preview) {
                this.logger.debug(`  Response Preview: ${preview}`);
              }
            }
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Log error response
          this.logger.error(
            `← ${method} ${url} | ${statusCode} | ${duration}ms | ERROR: ${error.message}`
          );

          if (this.isDevelopment && error.response) {
            this.logger.debug(`  Error Details: ${JSON.stringify(error.response)}`);
          }
        },
      })
    );
  }

  /**
   * Sanitize request body to hide sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }

  /**
   * Get a preview of response data (first 200 chars)
   */
  private getResponsePreview(data: any): string | null {
    if (!data) return null;

    try {
      // For paginated responses with data array, show URL fields
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        // All possible URL fields across all models
        const urlFields = ['imageUrl', 'introVideoUrl', 'docUrl', 'liveLink', 'recordingUrl', 'idUrl'];
        const urlSamples: any = {};
        
        // Check all items to find samples of each URL type
        for (const item of data.data) {
          for (const field of urlFields) {
            if (item[field] && !urlSamples[field]) {
              urlSamples[field] = item[field];
            }
          }
          
          // Stop if we found samples of all fields
          if (Object.keys(urlSamples).length === urlFields.length) {
            break;
          }
        }
        
        if (Object.keys(urlSamples).length > 0) {
          return `{data: [${data.data.length} items], URL SAMPLES: ${JSON.stringify(urlSamples)}, total: ${data.total || '?'}}`;
        }
        
        return `{data: [Array: ${data.data.length} items], total: ${data.total || '?'}}`;
      }
      
      const json = JSON.stringify(data);
      if (json.length <= 200) return json;
      
      // For large responses, show metadata only
      if (Array.isArray(data)) {
        return `[Array: ${data.length} items]`;
      }

      return json.substring(0, 200) + '...';
    } catch {
      return null;
    }
  }

  /**
   * Format bytes to human-readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}
