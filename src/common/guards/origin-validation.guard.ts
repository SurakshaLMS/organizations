import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * PRODUCTION ORIGIN VALIDATION GUARD
 * 
 * Blocks all requests that don't come from authorized frontend domains.
 * This prevents:
 * - Postman requests
 * - cURL requests
 * - Unauthorized API clients
 * - Direct browser access
 * 
 * Only allows requests from:
 * - lms.suraksha.lk
 * - org.suraksha.lk
 * - transport.suraksha.lk
 * - admin.suraksha.lk
 */
@Injectable()
export class OriginValidationGuard implements CanActivate {
  private readonly logger = new Logger(OriginValidationGuard.name);
  private readonly allowedOrigins: string[];
  private readonly isProduction: boolean;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    
    // Get allowed origins from environment
    const originsFromEnv = this.configService.get<string>('ALLOWED_ORIGINS', '');
    this.allowedOrigins = originsFromEnv
      .split(',')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    if (this.isProduction && this.allowedOrigins.length === 0) {
      this.logger.error('⚠️ SECURITY WARNING: No ALLOWED_ORIGINS configured in production!');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Skip validation in development
    if (!this.isProduction) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const userAgent = request.headers['user-agent'] || 'Unknown';
    
    // Detect and block common API testing tools
    const blockedUserAgents = [
      'postman',
      'insomnia',
      'thunder client',
      'httpie',
      'curl',
      'wget',
      'python-requests',
      'axios',
      'got',
      'node-fetch',
    ];
    
    const isApiTool = blockedUserAgents.some(tool => 
      userAgent.toLowerCase().includes(tool)
    );
    
    if (isApiTool) {
      this.logger.warn(`🚫 [SECURITY] API testing tool detected and blocked`);
      this.logger.warn(`   User-Agent: ${userAgent}`);
      this.logger.warn(`   Method: ${request.method} ${request.url}`);
      this.logger.warn(`   IP: ${request.ip}`);
      const response = context.switchToHttp().getResponse();
      response.status(403).end();
      return false;
    }
    
    // Block requests without origin header (primary check)
    if (!origin) {
      this.logger.warn(`🚫 [SECURITY] Request blocked - Missing origin header`);
      this.logger.warn(`   Method: ${request.method} ${request.url}`);
      this.logger.warn(`   IP: ${request.ip}`);
      this.logger.warn(`   User-Agent: ${userAgent}`);
      this.logger.warn(`   Referer: ${referer || 'None'}`);
      const response = context.switchToHttp().getResponse();
      response.status(403).end();
      return false;
    }

    // Extract domain from origin/referer
    let requestOrigin: string;
    try {
      const url = new URL(origin);
      requestOrigin = `${url.protocol}//${url.hostname}`;
      if (url.port && !['80', '443'].includes(url.port)) {
        requestOrigin += `:${url.port}`;
      }
    } catch (error) {
      this.logger.warn(`🚫 [SECURITY] Invalid origin format: ${origin}`);
      const response = context.switchToHttp().getResponse();
      response.status(403).end();
      return false;
    }

    // Check if origin is in whitelist
    const isAllowed = this.allowedOrigins.some(allowed => {
      // Exact match
      if (requestOrigin === allowed) return true;
      
      // Wildcard subdomain support (*.suraksha.lk)
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        return requestOrigin.endsWith(domain);
      }
      
      return false;
    });

    if (!isAllowed) {
      this.logger.warn(`🚫 [SECURITY] Unauthorized origin blocked: ${requestOrigin}`);
      this.logger.warn(`   Method: ${request.method} ${request.url}`);
      this.logger.warn(`   IP: ${request.ip}`);
      this.logger.warn(`   User-Agent: ${request.headers['user-agent']}`);
      this.logger.warn(`   Allowed origins: ${this.allowedOrigins.join(', ')}`);
      const response = context.switchToHttp().getResponse();
      response.status(403).end();
      return false;
    }

    // Log successful validation (only in verbose mode)
    if (this.configService.get<boolean>('LOG_ORIGIN_CHECKS', false)) {
      this.logger.log(`✅ Origin validated: ${requestOrigin}`);
    }

    return true;
  }
}
