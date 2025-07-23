import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Global Error Logging and Performance Monitoring Interceptor
 * Tracks request performance, logs errors, and monitors system health
 */
@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ErrorLoggingInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(`${method} ${url} - ${response.statusCode} - ${duration}ms`);
        
        // Log slow requests (>5 seconds)
        if (duration > 5000) {
          this.logger.warn(`Slow request detected: ${method} ${url} - ${duration}ms`);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Enhanced error logging with context
        this.logger.error(
          `${method} ${url} - ERROR: ${error.message} - ${duration}ms`,
          error.stack,
        );

        // Log BigInt specific errors
        if (error.message?.includes('BigInt') || error.message?.includes('bigint')) {
          this.logger.error(`BigInt Conversion Error: ${error.message}`, {
            url,
            method,
            duration,
            errorType: 'BIGINT_CONVERSION',
            stack: error.stack
          });
        }

        // Log JWT authentication errors
        if (error.message?.includes('Unauthorized') || error.message?.includes('JWT')) {
          this.logger.warn(`Authentication Error: ${error.message}`, {
            url,
            method,
            duration,
            errorType: 'AUTHENTICATION',
            userAgent: request.headers['user-agent']
          });
        }

        // Log database errors
        if (error.message?.includes('Prisma') || error.message?.includes('database')) {
          this.logger.error(`Database Error: ${error.message}`, {
            url,
            method,
            duration,
            errorType: 'DATABASE',
            query: error.query || 'N/A'
          });
        }

        return throwError(() => error);
      }),
    );
  }
}
