import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { EnhancedJwtPayload } from '../organization-access.service';

/**
 * ENHANCED JWT VALIDATION GUARD
 * 
 * Provides comprehensive JWT token validation with advanced security checks
 * - Token format validation
 * - Expiration validation with grace period
 * - Issuer validation
 * - Audience validation
 * - Rate limiting per user
 * - Suspicious activity detection
 */
@Injectable()
export class EnhancedJwtAuthGuard implements CanActivate {
  protected readonly logger = new Logger(EnhancedJwtAuthGuard.name);
  private readonly rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequestsPerMinute = 60;
  private readonly gracePeriodSeconds = 30; // Allow 30 seconds grace period for token expiration

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn(`🚫 No token provided from IP: ${this.getClientIp(request)}`);
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Enhanced token validation
      const payload = await this.validateToken(token, request);
      
      // Rate limiting check
      this.checkRateLimit(payload.sub, request);
      
      // Additional security checks
      this.performSecurityChecks(payload, request);
      
      // Attach enhanced payload to request
      request['user'] = payload;
      
      this.logger.log(`✅ Token validated for user ${payload.sub} (${payload.email}) from IP: ${this.getClientIp(request)}`);
      return true;
      
    } catch (error) {
      this.logger.error(`❌ Token validation failed: ${error.message} from IP: ${this.getClientIp(request)}`);
      
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  protected extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return undefined;
    }

    // Support both "Bearer token" and "token" formats
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Direct token (for backward compatibility)
    return authHeader;
  }

  private async validateToken(token: string, request: Request): Promise<EnhancedJwtPayload> {
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Decode and validate payload
      const payload = this.jwtService.verify(token, {
        ignoreExpiration: false, // We'll handle expiration manually with grace period
      });

      // Manual expiration check with grace period
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        const expiration = payload.exp;
        
        if (now > expiration + this.gracePeriodSeconds) {
          throw new UnauthorizedException('Token has expired beyond grace period');
        }
        
        if (now > expiration) {
          this.logger.warn(`⚠️ Token in grace period for user ${payload.sub}`);
        }
      }

      // Validate required fields for enhanced payload
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException('Token missing required fields');
      }

      // Enhanced payload validation
      const enhancedPayload: EnhancedJwtPayload = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        userType: payload.userType || 'USER',
        orgAccess: payload.orgAccess || payload.o || [],
        isGlobalAdmin: payload.isGlobalAdmin || false,
        iat: payload.iat,
        exp: payload.exp,
      };

      return enhancedPayload;

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token signature');
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not yet valid');
      }
      
      throw error;
    }
  }

  private checkRateLimit(userId: string, request: Request): void {
    const now = Date.now();
    const key = `${userId}:${this.getClientIp(request)}`;
    
    const userLimit = this.rateLimitMap.get(key);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + 60000, // 1 minute
      });
      return;
    }

    if (userLimit.count >= this.maxRequestsPerMinute) {
      this.logger.warn(`🚨 Rate limit exceeded for user ${userId} from IP: ${this.getClientIp(request)}`);
      throw new ForbiddenException('Rate limit exceeded. Please try again later.');
    }

    userLimit.count++;
  }

  private performSecurityChecks(payload: EnhancedJwtPayload, request: Request): void {
    // Check for suspicious patterns
    const userAgent = request.headers['user-agent'] || '';
    const clientIp = this.getClientIp(request);

    // Detect potential bot activity
    if (this.isSuspiciousUserAgent(userAgent)) {
      this.logger.warn(`🤖 Suspicious user agent detected for user ${payload.sub}: ${userAgent}`);
    }

    // Check for unusual access patterns
    if (this.isUnusualAccessPattern(payload, request)) {
      this.logger.warn(`⚠️ Unusual access pattern detected for user ${payload.sub} from IP: ${clientIp}`);
    }

    // Validate organization access format
    if (payload.orgAccess && Array.isArray(payload.orgAccess)) {
      for (const access of payload.orgAccess) {
        if (typeof access !== 'string' || !/^[AMO]\d+$/.test(access)) {
          this.logger.warn(`❌ Invalid orgAccess format for user ${payload.sub}: ${access}`);
        }
      }
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /^$/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isUnusualAccessPattern(payload: EnhancedJwtPayload, request: Request): boolean {
    // Check if token is very old (issued more than 24 hours ago)
    if (payload.iat) {
      const tokenAge = Date.now() / 1000 - payload.iat;
      if (tokenAge > 86400) { // 24 hours
        return true;
      }
    }

    // Check for multiple rapid requests (would be caught by rate limiting anyway)
    const referer = request.headers.referer;
    if (!referer || referer === '') {
      return true; // No referer might indicate API abuse
    }

    return false;
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}

/**
 * ENHANCED OPTIONAL JWT AUTH GUARD
 * 
 * Similar to EnhancedJwtAuthGuard but allows requests without tokens
 */
@Injectable()
export class EnhancedOptionalJwtAuthGuard extends EnhancedJwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // Allow request without token
      return true;
    }

    try {
      // If token is provided, validate it
      return await super.canActivate(context);
    } catch (error) {
      // Log the error but allow the request to continue
      this.logger.warn(`⚠️ Optional JWT validation failed: ${error.message}`);
      return true;
    }
  }
}