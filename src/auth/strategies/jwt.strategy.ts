import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UltraCompactJwtService } from '../services/ultra-compact-jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private ultraCompactJwtService: UltraCompactJwtService,
  ) {
    const jwtSecret = configService.get<string>('auth.jwtSecret') || 'default-secret-change-in-production';
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    
    this.logger.log('Initializing with ultra-compact token support');
  }

  async validate(payload: any) {
    this.logger.debug('Validating JWT payload format');
    
    try {
      let normalizedPayload;
      
      // Handle ultra-compact format with organization array (s, e, o fields)
      if (payload.s && payload.e && payload.o) {
        this.logger.debug('Detected ultra-compact JWT format with organizations');
        
        // Parse ultra-compact organizations: "P66" → { organizationId: "66", role: "PRESIDENT" }
        const organizations = payload.o.map((org: string) => {
          const roleLetter = org.charAt(0);
          const organizationId = org.substring(1);
          
          const roleMap: Record<string, string> = {
            'P': 'PRESIDENT', 'V': 'VICE_PRESIDENT', 'S': 'SECRETARY',
            'T': 'TREASURER', 'M': 'MEMBER', 'A': 'ADMIN', 
            'D': 'MODERATOR', 'W': 'VIEWER'
          };
          
          return {
            organizationId,
            role: roleMap[roleLetter] || 'MEMBER'
          };
        });
        
        normalizedPayload = {
          sub: payload.s,
          email: payload.e,
          name: payload.n || 'User',
          organizations,
          orgAccess: payload.o, // Keep the compact format for JWT Access Validation Service
          instituteIds: payload.ins || [],
          userType: payload.t ? this.expandUserType(payload.t) : undefined,
          isGlobalAdmin: payload.g === 1,
        };
      }
      // Handle Organization Manager ultra-compact format (s, ut, aa fields)
      else if (payload.s && payload.ut === 'OM') {
        this.logger.debug('Detected Organization Manager ultra-compact JWT format');
        
        // Parse admin access object: {"1": 1} → admin access to organization ID 1
        const adminAccess = payload.aa || {};
        const organizations = Object.keys(adminAccess).map(orgId => ({
          organizationId: orgId,
          role: 'ORGANIZATION_MANAGER' // OM tokens get ORGANIZATION_MANAGER role
        }));
        
        // Convert organizations to compact format for orgAccess
        const orgAccess = organizations.map(org => {
          const roleCodeMap: Record<string, string> = {
            'PRESIDENT': 'P',
            'ADMIN': 'A', 
            'MODERATOR': 'O',
            'MEMBER': 'M'
          };
          const roleCode = roleCodeMap[org.role] || 'M';
          return `${roleCode}${org.organizationId}`;
        });
        
        normalizedPayload = {
          sub: payload.s,
          email: payload.e || `om-${payload.s}@system.local`,
          name: payload.n || 'Organization Manager',
          organizations,
          orgAccess, // Add compact format
          instituteIds: payload.ins || [],
          userType: 'ORGANIZATION_MANAGER',
          isGlobalAdmin: false, // OM is not global admin
          adminAccess: adminAccess,
        };
      }
      // Handle other ultra-compact formats (s, ut, aa fields)
      else if (payload.s && payload.ut) {
        this.logger.debug('Detected ultra-compact JWT format with user type');
        
        // Parse admin access object: {"1": 1} → admin access to organization ID 1
        const adminAccess = payload.aa || {};
        const organizations = Object.keys(adminAccess).map(orgId => ({
          organizationId: orgId,
          role: 'ADMIN' // Users with admin access get ADMIN role
        }));
        
        // Convert organizations to compact format for orgAccess
        const orgAccess = organizations.map(org => {
          const roleCodeMap: Record<string, string> = {
            'PRESIDENT': 'P',
            'ADMIN': 'A', 
            'MODERATOR': 'O',
            'MEMBER': 'M'
          };
          const roleCode = roleCodeMap[org.role] || 'A'; // Default to ADMIN for admin access
          return `${roleCode}${org.organizationId}`;
        });
        
        normalizedPayload = {
          sub: payload.s,
          email: payload.e || `user-${payload.s}@system.local`,
          name: payload.n || 'User',
          organizations,
          orgAccess, // Add compact format
          instituteIds: payload.ins || [],
          userType: this.expandUserType(payload.ut),
          isGlobalAdmin: payload.ut === 'SA' || payload.ut === 'GA',
          adminAccess: adminAccess,
        };
      }
      // Handle standard format (sub, email, organizations fields)
      else if (payload.sub && payload.email && payload.organizations) {
        this.logger.debug('Detected standard JWT format');
        
        // Convert standard organizations to compact format for orgAccess
        const orgAccess = (payload.organizations || []).map((org: any) => {
          const roleCodeMap: Record<string, string> = {
            'PRESIDENT': 'P',
            'ADMIN': 'A', 
            'MODERATOR': 'O',
            'MEMBER': 'M'
          };
          const roleCode = roleCodeMap[org.role] || 'M';
          return `${roleCode}${org.organizationId}`;
        });
        
        normalizedPayload = {
          ...payload,
          orgAccess, // Add compact format
        };
      }
      // Handle SUPER_ADMIN/compact format (s, ut fields) 
      else if (payload.s && payload.ut) {
        this.logger.debug('Detected SUPER_ADMIN/Organization Manager compact format');
        
        // Parse admin access object: {"1": 1} → admin access to organization ID 1
        const adminAccess = payload.aa || {};
        const organizations = Object.keys(adminAccess).map(orgId => ({
          organizationId: orgId,
          role: 'ADMIN' // Users with admin access get ADMIN role
        }));
        
        // Convert organizations to compact format for orgAccess
        const orgAccess = organizations.map(org => {
          const roleCodeMap: Record<string, string> = {
            'PRESIDENT': 'P',
            'ADMIN': 'A', 
            'MODERATOR': 'O',
            'MEMBER': 'M'
          };
          const roleCode = roleCodeMap[org.role] || 'A'; // Default to ADMIN for admin access
          return `${roleCode}${org.organizationId}`;
        });
        
        normalizedPayload = {
          sub: payload.s,
          email: payload.e || `user-${payload.s}@system.local`,
          name: payload.n || 'User',
          organizations,
          orgAccess, // Add compact format
          instituteIds: payload.ins || [],
          userType: this.expandUserType(payload.ut),
          isGlobalAdmin: payload.ut === 'SA' || payload.ut === 'GA',
          adminAccess: adminAccess,
        };
      }
      // Legacy format fallback
      else if (payload.sub && payload.email) {
        this.logger.debug('Detected legacy JWT format');
        
        // Convert legacy organizations to compact format for orgAccess
        const orgAccess = (payload.organizations || []).map((org: any) => {
          const roleCodeMap: Record<string, string> = {
            'PRESIDENT': 'P',
            'ADMIN': 'A', 
            'MODERATOR': 'O',
            'MEMBER': 'M'
          };
          const roleCode = roleCodeMap[org.role] || 'M';
          return `${roleCode}${org.organizationId}`;
        });
        
        normalizedPayload = {
          ...payload,
          orgAccess, // Add compact format
        };
      }
      else {
        this.logger.error('Unrecognized JWT payload format');
        throw new UnauthorizedException('Invalid token format');
      }

      // Validate user exists
      const user = await this.authService.validateJwtUser(normalizedPayload);
      if (!user) {
        this.logger.warn(`User validation failed for userId: ${normalizedPayload.sub}`);
        throw new UnauthorizedException('User not found');
      }
      
      this.logger.debug(`JWT validation successful for user: ${user.userId}`);
      
      // Return standardized user object
      const result = {
        sub: normalizedPayload.sub,
        userId: normalizedPayload.sub,
        email: normalizedPayload.email,
        name: normalizedPayload.name,
        userType: normalizedPayload.userType,
        organizations: normalizedPayload.organizations || [],
        orgAccess: normalizedPayload.orgAccess || [], // Include compact format for JWT Access Validation
        instituteIds: normalizedPayload.instituteIds || [],
        isGlobalAdmin: normalizedPayload.isGlobalAdmin || false,
        adminAccess: normalizedPayload.adminAccess || {},
      };
      
      if (result.instituteIds.length > 0) {
        this.logger.debug(`User has access to ${result.instituteIds.length} institutes`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`);
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Expand compact user types to full names
   */
  private expandUserType(compactType: string): string {
    const typeMap: Record<string, string> = {
      'SA': 'SUPER_ADMIN',
      'OM': 'ORGANIZATION_MANAGER',
      'IA': 'INSTITUTE_ADMIN', 
      'GA': 'GLOBAL_ADMIN',
      'IU': 'INSTITUTE_USER',
      'ST': 'STUDENT',
      'TC': 'TEACHER',
      'PA': 'PARENT',
      'U': 'USER',
    };
    
    return typeMap[compactType] || compactType;
  }
}
