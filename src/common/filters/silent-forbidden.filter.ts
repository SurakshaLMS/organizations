import { ExceptionFilter, Catch, ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Silent Forbidden Exception Filter
 * 
 * Catches ForbiddenException (403) and drops the connection silently
 * No JSON response, no error message - connection just dies
 * 
 * This prevents:
 * - Attackers from getting any information
 * - Browser default error pages
 * - "Service Unavailable" messages
 * - Any response that confirms the server exists
 */
@Catch(ForbiddenException)
export class SilentForbiddenExceptionFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      // Development: Show detailed error for debugging
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || 'Forbidden',
        error: 'Forbidden',
        environment: 'development',
      });
    } else {
      // Production: Drop connection silently - no response at all
      // This makes it look like the server doesn't exist or DNS failed
      response.socket?.destroy();
    }
  }
}
