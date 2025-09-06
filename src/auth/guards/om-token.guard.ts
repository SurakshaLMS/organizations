import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OrganizationManagerTokenGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false;
    }

    const token = authHeader.replace('Bearer ', '');
    const validOMToken = this.configService.get<string>('OM_TOKEN');

    if (!validOMToken) {
      console.log('❌ OM token not configured in environment');
      return false;
    }
    
    // Check if it's the special OM token
    if (token === validOMToken) {
      console.log('✅ Organization Manager special token validated');
      
      // Set user object on request for Organization Manager
      (request as any).user = {
        sub: 'OM_USER',
        userId: 'OM_USER',
        email: 'org.manager@system.local',
        name: 'Organization Manager',
        userType: 'ORGANIZATION_MANAGER',
        organizations: [],
        instituteIds: [],
        isGlobalAdmin: true,
        adminAccess: {},
      };
      
      return true;
    }

    return false;
  }
}
