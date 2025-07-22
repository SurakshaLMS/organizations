import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { OrganizationAccessService, EnhancedJwtPayload, convertToString, convertToBigInt } from './organization-access.service';
import { LoginDto, SetupPasswordDto, ChangePasswordDto } from './dto/auth.dto';

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    userType?: string;
    isFirstLogin?: boolean;
    lastLoginAt?: Date;
  };
  permissions: {
    organizations: string[];
    isGlobalAdmin: boolean;
  };
  needsPasswordSetup?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly pepper: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private enhancedAuthService: EnhancedAuthService,
    private organizationAccessService: OrganizationAccessService,
  ) {
    // Initialize pepper for additional password security
    this.pepper = this.configService.get<string>('BCRYPT_PEPPER') || 'default-pepper-change-in-production';
  }

  /**
   * Enhanced login with support for synced LAAS users
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;
    
    console.log('🔐 AuthService.login called with email:', email);
    this.logger.log(`🔐 Login attempt for: ${email}`);

    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        this.logger.warn(`❌ User not found: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user has password set
      if (!user.password) {
        this.logger.warn(`⚠️ User ${email} needs password setup`);
        return {
          access_token: '',
          user: {
            id: convertToString(user.userId),
            email: user.email,
            name: user.name,
          },
          permissions: {
            organizations: [],
            isGlobalAdmin: false,
          },
          needsPasswordSetup: true
        };
      }

      // Validate password with enhanced security
      const isPasswordValid = await this.validatePasswordWithFallback(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`❌ Invalid password for: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login timestamp
      await this.updateLastLogin(user.userId);

      // Get user's organization access
      const [orgAccess, isGlobalAdmin] = await Promise.all([
        this.organizationAccessService.getUserOrganizationAccessCompact(user.userId),
        this.organizationAccessService.isGlobalOrganizationAdmin(user.userId)
      ]);

      // Generate enhanced JWT token
      const payload: EnhancedJwtPayload = { 
        sub: convertToString(user.userId), 
        email: user.email, 
        name: user.name,
        orgAccess,
        isGlobalAdmin,
        iat: Math.floor(Date.now() / 1000),
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h')
      });

      this.logger.log(`✅ Login successful for: ${email}`);

      return {
        access_token: accessToken,
        user: {
          id: convertToString(user.userId),
          email: user.email,
          name: user.name,
          isFirstLogin: !user.updatedAt || user.createdAt === user.updatedAt,
          lastLoginAt: new Date()
        },
        permissions: {
          organizations: orgAccess,
          isGlobalAdmin
        }
      };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login error for ${email}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Enhanced password validation with multiple fallback methods for LAAS compatibility
   */
  private async validatePasswordWithFallback(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      // Method 1: Try enhanced auth service (current system)
      const enhancedMatch = await this.enhancedAuthService.validatePassword(plainPassword, hashedPassword);
      if (enhancedMatch) {
        this.logger.debug('✅ Password validated using enhanced method');
        return true;
      }

      // Method 2: Try direct bcrypt comparison (LAAS legacy)
      const directMatch = await bcrypt.compare(plainPassword, hashedPassword);
      if (directMatch) {
        this.logger.debug('✅ Password validated using direct bcrypt (LAAS legacy)');
        // Auto-migrate to enhanced format in background
        this.autoMigratePassword(plainPassword, hashedPassword).catch(err => 
          this.logger.warn('Password auto-migration failed:', err)
        );
        return true;
      }

      // Method 3: Try with pepper (advanced LAAS format)
      const pepperedPassword = this.createPepperedPassword(plainPassword);
      const pepperedMatch = await bcrypt.compare(pepperedPassword, hashedPassword);
      if (pepperedMatch) {
        this.logger.debug('✅ Password validated using peppered format');
        return true;
      }

      this.logger.debug('❌ All password validation methods failed');
      return false;

    } catch (error) {
      this.logger.error('Password validation error:', error);
      return false;
    }
  }

  /**
   * Create peppered password for enhanced security
   */
  private createPepperedPassword(password: string): string {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(password)
      .digest('hex') + password;
  }

  /**
   * Auto-migrate legacy passwords to enhanced format
   */
  private async autoMigratePassword(plainPassword: string, oldHash: string): Promise<void> {
    try {
      const newHash = await this.enhancedAuthService.hashPassword(plainPassword);
      
      // Update password in database
      await this.prisma.user.updateMany({
        where: { password: oldHash },
        data: { password: newHash }
      });
      
      this.logger.log('🔄 Password auto-migrated to enhanced format');
    } catch (error) {
      this.logger.error('Password auto-migration failed:', error);
    }
  }

  /**
   * Setup password for first-time users (from sync)
   */
  async setupPassword(setupPasswordDto: SetupPasswordDto) {
    const { email, newPassword } = setupPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.password) {
      throw new ConflictException('Password already set up. Use change password instead.');
    }

    // Hash password with enhanced security
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date() // Mark as updated to indicate setup complete
      },
    });

    this.logger.log(`✅ Password setup completed for: ${email}`);

    return {
      message: 'Password set up successfully',
      user: {
        id: convertToString(user.userId),
        email: user.email,
        name: user.name
      }
    };
  }

  /**
   * Change password for existing users
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const userBigIntId = convertToBigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('User not found or password not set');
    }

    // Validate current password
    const isCurrentPasswordValid = await this.validatePasswordWithFallback(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userId: userBigIntId },
      data: { password: hashedPassword },
    });

    this.logger.log(`✅ Password changed for user: ${userId}`);

    return {
      message: 'Password changed successfully'
    };
  }

  /**
   * Get user profile with institute information
   */
  async getUserProfile(userId: string) {
    const userBigIntId = convertToBigInt(userId);
    
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
      include: {
        instituteUsers: {
          include: {
            institute: {
              select: {
                instituteId: true,
                name: true,
                imageUrl: true
              }
            }
          }
        },
        organizationUsers: {
          include: {
            organization: {
              select: {
                organizationId: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      id: convertToString(user.userId),
      email: user.email,
      name: user.name,
      lastSyncAt: user.lastSyncAt,
      institutes: user.instituteUsers.map(iu => ({
        instituteId: convertToString(iu.institute.instituteId),
        name: iu.institute.name,
        role: iu.role,
        isActive: iu.isActive,
        imageUrl: iu.institute.imageUrl
      })),
      organizations: user.organizationUsers.map(ou => ({
        organizationId: convertToString(ou.organization.organizationId),
        name: ou.organization.name,
        type: ou.organization.type,
        role: ou.role,
        isVerified: ou.isVerified
      }))
    };
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: bigint): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { userId },
        data: { updatedAt: new Date() }
      });
    } catch (error) {
      this.logger.warn('Failed to update last login:', error);
    }
  }

  /**
   * Validate if user exists and is active
   */
  async validateUser(email: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return null;
    }

    return {
      id: convertToString(user.userId),
      email: user.email,
      name: user.name,
      hasPassword: !!user.password
    };
  }

  /**
   * Validate JWT token payload and return user information
   */
  async validateJwtUser(payload: any) {
    const userBigIntId = convertToBigInt(payload.sub);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  /**
   * Refresh organization access in JWT token
   */
  async refreshUserToken(userId: string) {
    const userBigIntId = convertToBigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get updated organization access
    const [orgAccess, isGlobalAdmin] = await Promise.all([
      this.organizationAccessService.getUserOrganizationAccessCompact(userBigIntId),
      this.organizationAccessService.isGlobalOrganizationAdmin(userBigIntId)
    ]);

    // Generate new JWT token with updated access
    const payload: EnhancedJwtPayload = { 
      sub: convertToString(user.userId), 
      email: user.email, 
      name: user.name,
      orgAccess,
      isGlobalAdmin,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: convertToString(user.userId),
        email: user.email,
        name: user.name,
      },
    };
  }
}
