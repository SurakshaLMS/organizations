import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UltraCompactJwtService } from '../services/ultra-compact-jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private ultraCompactJwtService: UltraCompactJwtService,
  ) {
    const jwtSecret = configService.get<string>('auth.jwtSecret') || 'default-secret-change-in-production';
    console.log('JWT Strategy - Initializing with ultra-compact token support');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    console.log('🔍 JWT Strategy - Validating payload format...');
    
    try {
      let normalizedPayload;
      
      // Handle ultra-compact format (s, e, o fields)
      if (payload.s && payload.e && payload.o) {
        console.log('✅ Detected ultra-compact JWT format');
        
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
          instituteIds: payload.ins || [],
          userType: payload.t ? this.expandUserType(payload.t) : undefined,
          isGlobalAdmin: payload.g === 1,
        };
      }
      // Handle standard format (sub, email, organizations fields)
      else if (payload.sub && payload.email && payload.organizations) {
        console.log('✅ Detected standard JWT format');
        normalizedPayload = payload;
      }
      // Handle SUPER_ADMIN/compact format (s, ut fields) 
      else if (payload.s && payload.ut) {
        console.log('✅ Detected SUPER_ADMIN compact format');
        normalizedPayload = {
          sub: payload.s,
          email: payload.e || `admin-${payload.s}@system.local`,
          name: payload.n || 'System Administrator',
          organizations: [],
          instituteIds: payload.ins || [],
          userType: payload.ut === 'SA' ? 'SUPER_ADMIN' : this.expandUserType(payload.ut),
          isGlobalAdmin: true,
        };
      }
      // Legacy format fallback
      else if (payload.sub && payload.email) {
        console.log('✅ Detected legacy JWT format');
        normalizedPayload = payload;
      }
      else {
        console.log('❌ Unrecognized JWT payload format');
        throw new UnauthorizedException('Invalid token format');
      }

      // Validate user exists
      const user = await this.authService.validateJwtUser(normalizedPayload);
      if (!user) {
        console.log('❌ User validation failed for:', normalizedPayload.sub);
        throw new UnauthorizedException('User not found');
      }
      
      console.log('✅ JWT validation successful for user:', user.userId);
      
      // Return standardized user object
      const result = {
        sub: normalizedPayload.sub,
        userId: normalizedPayload.sub,
        email: normalizedPayload.email,
        name: normalizedPayload.name,
        userType: normalizedPayload.userType,
        organizations: normalizedPayload.organizations || [],
        instituteIds: normalizedPayload.instituteIds || [],
        isGlobalAdmin: normalizedPayload.isGlobalAdmin || false,
      };
      
      if (result.instituteIds.length > 0) {
        console.log('🏫 User has access to institutes:', result.instituteIds);
      }
      
      return result;
    } catch (error) {
      console.error('❌ JWT validation error:', error.message);
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
