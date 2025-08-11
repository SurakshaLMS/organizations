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
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret') || 'default-secret',
    });
  }

  async validate(payload: EnhancedJwtPayload) {
    const user = await this.authService.validateJwtUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    
    // Return enhanced payload with compact organization access
    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      userType: payload.userType, // Include userType (ORGANIZATION_MANAGER, etc.)
      orgAccess: payload.orgAccess || [], // Compact format
      isGlobalAdmin: payload.isGlobalAdmin || false,
    };
  }
}
