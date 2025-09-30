import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { EnhancedJwtPayload } from '../organization-access.service';

/**
 * ENHANCED JWT VALIDATION INTERCEPTOR
 * 
 * Provides additional JWT token validation and security logging
 * - Request/response logging with user context
 * - Token usage analytics
 * - Security event monitoring
 * - Performance metrics
 * - Anomaly detection
 */
@Injectable()
export class EnhancedJwtValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(EnhancedJwtValidationInterceptor.name);
  private readonly requestMetrics = new Map<string, { count: number; totalTime: number; errors: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    
    const user = request['user'] as EnhancedJwtPayload;
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const clientIp = this.getClientIp(request);

    // Enhanced request logging
    if (user) {
      this.logger.log(`🔐 ${method} ${url} - User: ${user.email} (${user.sub}) - IP: ${clientIp} - UA: ${userAgent.substring(0, 50)}...`);
      
      // Track user activity patterns
      this.trackUserActivity(user, request);
      
      // Additional security checks
      this.performRuntimeSecurityChecks(user, request);
    } else {
      this.logger.log(`🌐 ${method} ${url} - Anonymous - IP: ${clientIp}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        
        // Log successful responses
        if (user) {
          this.logger.log(`✅ ${method} ${url} - ${statusCode} - ${duration}ms - User: ${user.email}`);
          this.updateMetrics(user.sub, duration, false);
        } else {
          this.logger.log(`✅ ${method} ${url} - ${statusCode} - ${duration}ms - Anonymous`);
        }

        // Track API usage patterns
        this.trackApiUsage(method, url, statusCode, duration, user);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;
        
        // Enhanced error logging
        if (user) {
          this.logger.error(`❌ ${method} ${url} - ${statusCode} - ${duration}ms - User: ${user.email} - Error: ${error.message}`);
          this.updateMetrics(user.sub, duration, true);
          
          // Security incident logging
          if (this.isSecurityRelatedError(error)) {
            this.logSecurityIncident(user, request, error);
          }
        } else {
          this.logger.error(`❌ ${method} ${url} - ${statusCode} - ${duration}ms - Anonymous - Error: ${error.message}`);
        }

        return throwError(() => error);
      }),
    );
  }

  private trackUserActivity(user: EnhancedJwtPayload, request: Request): void {
    const activity = {
      userId: user.sub,
      email: user.email,
      endpoint: `${request.method} ${request.url}`,
      timestamp: new Date().toISOString(),
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      orgAccess: user.orgAccess,
    };

    // Log high-privilege user activities
    if (user.isGlobalAdmin || this.hasHighPrivileges(user)) {
      this.logger.warn(`🔒 HIGH-PRIVILEGE ACCESS: ${activity.email} - ${activity.endpoint} - IP: ${activity.ip}`);
    }

    // Detect unusual access patterns
    if (this.isUnusualActivity(user, request)) {
      this.logger.warn(`⚠️ UNUSUAL ACTIVITY: ${activity.email} - ${activity.endpoint} - IP: ${activity.ip}`);
    }
  }

  private performRuntimeSecurityChecks(user: EnhancedJwtPayload, request: Request): void {
    // Check for token age
    if (user.iat) {
      const tokenAge = Date.now() / 1000 - user.iat;
      if (tokenAge > 86400) { // 24 hours
        this.logger.warn(`🕐 OLD TOKEN WARNING: User ${user.email} using token older than 24 hours`);
      }
    }

    // Check for suspicious request patterns
    const referer = request.headers.referer;
    if (!referer && request.method !== 'GET') {
      this.logger.warn(`🚨 NO REFERER: ${user.email} - ${request.method} ${request.url}`);
    }

    // Validate organization access format
    if (user.orgAccess) {
      for (const access of user.orgAccess) {
        if (!/^[AMOP]\d+$/.test(access)) {
          this.logger.error(`❌ INVALID ORG ACCESS FORMAT: ${user.email} - ${access}`);
        }
      }
    }

    // Check for privilege escalation attempts
    if (this.isPotentialPrivilegeEscalation(user, request)) {
      this.logger.error(`🚨 POTENTIAL PRIVILEGE ESCALATION: ${user.email} - ${request.method} ${request.url}`);
    }
  }

  private updateMetrics(userId: string, duration: number, isError: boolean): void {
    const userMetrics = this.requestMetrics.get(userId) || { count: 0, totalTime: 0, errors: 0 };
    
    userMetrics.count++;
    userMetrics.totalTime += duration;
    if (isError) userMetrics.errors++;
    
    this.requestMetrics.set(userId, userMetrics);

    // Log metrics periodically
    if (userMetrics.count % 100 === 0) {
      const avgTime = userMetrics.totalTime / userMetrics.count;
      const errorRate = (userMetrics.errors / userMetrics.count) * 100;
      
      this.logger.log(`📊 USER METRICS: ${userId} - Requests: ${userMetrics.count}, Avg Time: ${avgTime.toFixed(2)}ms, Error Rate: ${errorRate.toFixed(2)}%`);
    }
  }

  private trackApiUsage(method: string, url: string, statusCode: number, duration: number, user?: EnhancedJwtPayload): void {
    const endpoint = `${method} ${url.split('?')[0]}`; // Remove query params for grouping
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      this.logger.warn(`🐌 SLOW REQUEST: ${endpoint} - ${duration}ms - User: ${user?.email || 'anonymous'}`);
    }

    // Log error patterns
    if (statusCode >= 400) {
      this.logger.warn(`⚠️ ERROR RESPONSE: ${endpoint} - ${statusCode} - User: ${user?.email || 'anonymous'}`);
    }
  }

  private hasHighPrivileges(user: EnhancedJwtPayload): boolean {
    if (user.isGlobalAdmin) return true;
    
    // Check for admin or president roles in any organization
    return user.orgAccess.some(access => access.startsWith('A') || access.startsWith('P'));
  }

  private isUnusualActivity(user: EnhancedJwtPayload, request: Request): boolean {
    // Check for unusual user agents
    const userAgent = request.headers['user-agent'] || '';
    if (/curl|wget|python|bot|crawler/i.test(userAgent)) {
      return true;
    }

    // Check for unusual request patterns
    if (request.method === 'DELETE' && !user.isGlobalAdmin) {
      return true; // Non-admin delete requests
    }

    return false;
  }

  private isSecurityRelatedError(error: any): boolean {
    return (
      error instanceof UnauthorizedException ||
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes('token') ||
      error.message?.includes('auth') ||
      error.message?.includes('permission')
    );
  }

  private logSecurityIncident(user: EnhancedJwtPayload, request: Request, error: any): void {
    const incident = {
      timestamp: new Date().toISOString(),
      userId: user.sub,
      email: user.email,
      endpoint: `${request.method} ${request.url}`,
      error: error.message,
      statusCode: error.status,
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
      referer: request.headers.referer,
      orgAccess: user.orgAccess,
    };

    this.logger.error(`🚨 SECURITY INCIDENT: ${JSON.stringify(incident)}`);
  }

  private isPotentialPrivilegeEscalation(user: EnhancedJwtPayload, request: Request): boolean {
    const url = request.url.toLowerCase();
    
    // Check for admin endpoints accessed by non-admins
    if (url.includes('/admin/') && !user.isGlobalAdmin) {
      return true;
    }

    // Check for organization management endpoints
    if (url.includes('/organizations/') && request.method !== 'GET' && !this.hasHighPrivileges(user)) {
      return true;
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