import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EnhancedAuthService } from './enhanced-auth.service';
import { OrganizationAccessService } from './organization-access.service';
import { JwtAccessValidationService } from './jwt-access-validation.service';
import { UltraCompactAccessValidationService } from './services/ultra-compact-access-validation.service';
import { UltraCompactJwtService } from './services/ultra-compact-jwt.service';
import { EnhancedAccessService } from './services/enhanced-access.service';
import { OrganizationAccessGuard } from './guards/organization-access.guard';
import { EnhancedOrganizationSecurityGuard } from './guards/enhanced-organization-security.guard';
import { OrganizationManagerTokenGuard } from './guards/om-token.guard';
import { HybridOrganizationManagerGuard } from './guards/hybrid-om.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    EnhancedAuthService, 
    OrganizationAccessService,
    JwtAccessValidationService,
    UltraCompactAccessValidationService, // ✅ Ultra-compact JWT access validation
    UltraCompactJwtService,              // ✅ Ultra-compact JWT service with institute IDs
    EnhancedAccessService,               // ✅ Enhanced access validation service
    OrganizationAccessGuard,
    EnhancedOrganizationSecurityGuard,
    OrganizationManagerTokenGuard,       // ✅ Organization Manager token guard
    HybridOrganizationManagerGuard,      // ✅ Hybrid OM guard (static + JWT tokens)
  ],
  exports: [
    AuthService, 
    JwtStrategy, 
    EnhancedAuthService, 
    OrganizationAccessService,
    JwtAccessValidationService,
    UltraCompactAccessValidationService, // ✅ Ultra-compact JWT access validation
    UltraCompactJwtService,              // ✅ Ultra-compact JWT service with institute IDs
    EnhancedAccessService,               // ✅ Enhanced access validation service
    OrganizationAccessGuard,
    EnhancedOrganizationSecurityGuard,
    OrganizationManagerTokenGuard,       // ✅ Organization Manager token guard
    HybridOrganizationManagerGuard,      // ✅ Hybrid OM guard (static + JWT tokens)
    JwtModule,                           // ✅ Export JwtModule to make JwtService available
  ],
})
export class AuthModule {}
