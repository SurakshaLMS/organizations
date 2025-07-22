import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip;
    const startTime = Date.now();

    // Extract sensitive operation details
    const organizationId = request.params?.id || request.body?.organizationId;
    const action = this.getActionFromUrl(method, url);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          this.logAuditEvent('SUCCESS', {
            userId: user?.sub,
            userEmail: user?.email,
            action,
            organizationId,
            method,
            url,
            ip,
            userAgent,
            duration,
            timestamp: new Date().toISOString(),
            responseSize: this.safeStringify(response).length,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logAuditEvent('ERROR', {
            userId: user?.sub,
            userEmail: user?.email,
            action,
            organizationId,
            method,
            url,
            ip,
            userAgent,
            duration,
            error: error.message,
            statusCode: error.status,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  private getActionFromUrl(method: string, url: string): string {
    const urlParts = url.split('/');
    
    if (url.includes('/enroll')) return 'ENROLL_USER';
    if (url.includes('/verify')) return 'VERIFY_USER';
    if (url.includes('/leave')) return 'LEAVE_ORGANIZATION';
    if (url.includes('/members')) return 'VIEW_MEMBERS';
    if (url.includes('/causes')) return 'VIEW_CAUSES';
    if (url.includes('/dashboard')) return 'VIEW_DASHBOARD';
    if (url.includes('/enrolled')) return 'VIEW_ENROLLED_ORGS';
    
    switch (method) {
      case 'POST': return 'CREATE_ORGANIZATION';
      case 'PUT': return 'UPDATE_ORGANIZATION';
      case 'DELETE': return 'DELETE_ORGANIZATION';
      case 'GET': return 'VIEW_ORGANIZATION';
      default: return 'UNKNOWN_ACTION';
    }
  }

  private logAuditEvent(status: 'SUCCESS' | 'ERROR', details: any): void {
    const logLevel = status === 'ERROR' ? 'error' : 'log';
    this.logger[logLevel](`[AUDIT] ${status}`, details);
  }

  private safeStringify(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value;
    });
  }
}
