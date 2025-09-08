import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Hybrid Organization Manager Guard
 * 
 * Accepts both:
 * 1. Static OM_TOKEN from environment
 * 2. JWT tokens with ultra-compact format where ut: "OM"
 */
@Injectable()
export class HybridOrganizationManagerGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // Validate authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header missing or invalid format');
    }

    const token = authHeader.replace('Bearer ', '');

    // Try static OM token first
    const staticOMToken = this.configService.get<string>('OM_TOKEN');
    if (staticOMToken && token === staticOMToken) {
      console.log('✅ Static Organization Manager token validated');
      this.setStaticOMUser(request);
      return true;
    }

    // Try JWT token with OM type - using OM_TOKEN as secret for Organization Manager JWTs
    try {
      const omTokenSecret = this.configService.get<string>('OM_TOKEN');
      if (!omTokenSecret) {
        throw new UnauthorizedException('OM_TOKEN not configured in environment');
      }
      
      const payload = await this.jwtService.verifyAsync(token, { secret: omTokenSecret });
      
      // Check if it's an Organization Manager JWT token
      if (payload.ut === 'OM' || payload.userType === 'ORGANIZATION_MANAGER') {
        console.log('✅ JWT Organization Manager token validated:', {
          userId: payload.s || payload.sub,
          userType: payload.ut || payload.userType,
          adminAccess: payload.aa || payload.adminAccess
        });
        
        this.setJWTOMUser(request, payload);
        return true;
      } else {
        console.log('❌ JWT token is not Organization Manager type:', payload.ut || payload.userType);
        throw new UnauthorizedException('Token is not for Organization Manager');
      }
    } catch (jwtError) {
      console.log('❌ JWT validation failed:', jwtError.message);
      throw new UnauthorizedException('Invalid Organization Manager token');
    }
  }

  private setStaticOMUser(request: any) {
    // Create standardized user object for static OM token
    const organizationManagerUser = {
      // Standard JWT fields
      sub: 'OM_USER',
      userId: 'OM_USER', 
      id: 'OM_USER',
      
      // User information
      email: 'org.manager@system.local',
      firstName: 'Organization',
      lastName: 'Manager',
      name: 'Organization Manager',
      
      // User type
      userType: 'ORGANIZATION_MANAGER',
      ut: 'OM',
      
      // Access control
      isGlobalAdmin: true,
      isOrganizationManager: true,
      adminAccess: {},
      hierarchicalAccess: {},
      organizations: [],
      instituteIds: [],
      
      // Token metadata
      tokenType: 'OM_TOKEN',
      authMethod: 'STATIC_OM_TOKEN',
      iat: Math.floor(Date.now() / 1000),
    };

    request.user = organizationManagerUser;
  }

  private setJWTOMUser(request: any, payload: any) {
    // Create standardized user object for JWT OM token
    const organizationManagerUser = {
      // Standard JWT fields
      sub: payload.s || payload.sub,
      userId: payload.s || payload.sub,
      id: payload.s || payload.sub,
      
      // User information
      email: payload.e || payload.email || `om-${payload.s || payload.sub}@system.local`,
      firstName: payload.fn || payload.firstName || 'Organization',
      lastName: payload.ln || payload.lastName || 'Manager',
      name: payload.n || payload.name || 'Organization Manager',
      
      // User type
      userType: 'ORGANIZATION_MANAGER',
      ut: 'OM',
      
      // Access control from JWT
      isGlobalAdmin: true,
      isOrganizationManager: true,
      adminAccess: payload.aa || payload.adminAccess || {},
      hierarchicalAccess: payload.ha || payload.hierarchicalAccess || {},
      organizations: payload.organizations || [],
      instituteIds: payload.ins || payload.instituteIds || [],
      
      // Token metadata
      tokenType: 'JWT',
      authMethod: 'JWT_OM_TOKEN',
      iat: payload.iat,
      exp: payload.exp,
      
      // Ultra-compact JWT specific fields
      originalPayload: payload
    };

    request.user = organizationManagerUser;
  }
}
