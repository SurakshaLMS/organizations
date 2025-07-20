import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnhancedJwtPayload } from '../organization-access.service';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (requests: number, windowMs: number) => 
  SetMetadata(RATE_LIMIT_KEY, { requests, windowMs });

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitOptions = this.reflector.get<{ requests: number; windowMs: number }>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const request = context.switchToHttp().getRequest();
    const user: EnhancedJwtPayload = request.user;
    
    // Use user ID for authenticated requests, IP for anonymous
    const identifier = user?.sub || request.ip;
    const now = Date.now();
    const { requests, windowMs } = rateLimitOptions;

    const userRequestData = this.requestCounts.get(identifier);

    if (!userRequestData || now > userRequestData.resetTime) {
      // Reset or initialize counter
      this.requestCounts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (userRequestData.count >= requests) {
      throw new ForbiddenException(
        `Rate limit exceeded. Maximum ${requests} requests per ${windowMs / 1000} seconds.`
      );
    }

    // Increment counter
    userRequestData.count++;
    return true;
  }
}
