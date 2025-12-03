import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * ✅ SECURITY HARDENED Global Exception Filter
 * - Prevents sensitive information leakage
 * - Handles SQL/database errors securely
 * - Sanitizes error messages in production
 * - Proper logging without exposing internals
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    // ✅ Handle different exception types securely
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      message = typeof errorResponse === 'string' ? errorResponse : (errorResponse as any).message;
      
      // Preserve validation errors (safe to show)
      if (Array.isArray((errorResponse as any).message)) {
        errorDetails = { validationErrors: (errorResponse as any).message };
        // Log validation errors for debugging
        this.logger.warn(`Validation failed: ${JSON.stringify((errorResponse as any).message)}`);
      }
    } 
    // ✅ SECURITY: Handle Prisma/Database errors without leaking schema
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = this.handlePrismaError(exception);
      message = this.getSafePrismaErrorMessage(exception);
      
      // Log detailed error internally only
      this.logger.error(`Prisma Error [${exception.code}]: ${exception.message}`, exception.stack);
    }
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request data';
      this.logger.error(`Prisma Validation Error: ${exception.message}`);
    }
    // ✅ SECURITY: Generic errors - don't expose internals in production
    else if (exception instanceof Error) {
      // Only show detailed error messages in development
      message = this.isProduction ? 'An unexpected error occurred' : exception.message;
      
      // Log full error internally
      this.logger.error(
        `Unhandled Error: ${exception.message}`,
        exception.stack,
      );
    }

    // ✅ Log for monitoring (with sanitized details)
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message} - IP: ${this.getClientIp(request)}`,
    );

    // ✅ SECURITY: Clean error response (no sensitive data)
    const errorResponse: any = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add validation details if present (safe to show)
    if (errorDetails) {
      errorResponse.details = errorDetails;
    }

    // ✅ SECURITY: Never send stack traces in production
    if (!this.isProduction && exception instanceof Error) {
      errorResponse.debug = {
        stack: exception.stack,
        name: exception.name,
      };
    }

    response.status(status).json(errorResponse);
  }

  /**
   * ✅ SECURITY: Handle Prisma errors without exposing database schema
   */
  private handlePrismaError(exception: Prisma.PrismaClientKnownRequestError): number {
    switch (exception.code) {
      case 'P2002': // Unique constraint violation
        return HttpStatus.CONFLICT;
      case 'P2003': // Foreign key constraint violation
        return HttpStatus.BAD_REQUEST;
      case 'P2025': // Record not found
        return HttpStatus.NOT_FOUND;
      case 'P2014': // Invalid ID
      case 'P2015': // Related record not found
      case 'P2016': // Query interpretation error
      case 'P2017': // Records for relation not connected
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * ✅ SECURITY: Convert Prisma errors to safe user messages
   */
  private getSafePrismaErrorMessage(exception: Prisma.PrismaClientKnownRequestError): string {
    switch (exception.code) {
      case 'P2002':
        // Extract field name from meta if available
        const target = (exception.meta?.target as string[]) || [];
        const field = target.length > 0 ? target[0] : 'field';
        return `A record with this ${field} already exists`;
      case 'P2003':
        return 'Invalid reference to related record';
      case 'P2025':
        return 'Record not found';
      case 'P2014':
      case 'P2015':
      case 'P2016':
      case 'P2017':
        return 'Invalid data provided';
      default:
        return this.isProduction 
          ? 'A database error occurred' 
          : `Database error: ${exception.code}`;
    }
  }

  /**
   * Get client IP address (proxy-aware)
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get standardized error name
   */
  private getErrorName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Too Many Requests';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }
}
