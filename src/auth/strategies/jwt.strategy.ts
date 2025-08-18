import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { EnhancedJwtPayload } from '../organization-access.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('auth.jwtSecret') || 'default-secret';
    console.log('JWT Strategy - Initializing with secret:', jwtSecret.substring(0, 20) + '...');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy - validating payload:', { sub: payload.sub, email: payload.email });
    
    try {
      const user = await this.authService.validateJwtUser(payload);
      if (!user) {
        console.log('JWT Strategy - User validation failed');
        throw new UnauthorizedException();
      }
      
      console.log('JWT Strategy - User validated successfully:', user.userId);
      
      // Handle both legacy and new token formats
      const orgAccess = payload.orgAccess || [];
      const organizations = payload.organizations || [];
      
      const result = {
        sub: payload.sub,
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        userType: payload.userType, // Include userType (ORGANIZATION_MANAGER, etc.)
        orgAccess: orgAccess, // Compact format
        organizations: organizations, // Legacy format for backward compatibility
        isGlobalAdmin: payload.isGlobalAdmin || false,
      };
      
      console.log('JWT Strategy - Returning user data:', { sub: result.sub, email: result.email });
      return result;
    } catch (error) {
      console.error('JWT Strategy - Validation error:', error.message);
      throw new UnauthorizedException();
    }
  }
}
