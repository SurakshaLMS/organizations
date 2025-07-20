import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';

@Injectable()
export class SearchValidationGuard implements CanActivate {
  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--|\*|\/\*|\*\/|;|'|"|`)/,
    /(\b(or|and)\b.*[=<>])/i,
    /(script|javascript|vbscript)/i,
  ];

  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { search } = request.query;

    if (!search) {
      return true; // No search query to validate
    }

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(search)) {
        throw new BadRequestException('Invalid search query: Potential security risk detected');
      }
    }

    // Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(search)) {
        throw new BadRequestException('Invalid search query: Malicious content detected');
      }
    }

    // Check length and characters
    if (search.length > 100) {
      throw new BadRequestException('Search query too long (max 100 characters)');
    }

    // Allow only alphanumeric, spaces, and safe characters
    const safePattern = /^[a-zA-Z0-9\s\-_.@]+$/;
    if (!safePattern.test(search)) {
      throw new BadRequestException('Search query contains invalid characters');
    }

    return true;
  }
}
