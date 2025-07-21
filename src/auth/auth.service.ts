import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { OrganizationAccessService, EnhancedJwtPayload, convertToString, convertToBigInt } from './organization-access.service';
import { LoginDto, SetupPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private enhancedAuthService: EnhancedAuthService,
    private organizationAccessService: OrganizationAccessService,
  ) {}

  /**
   * User login - validates credentials and returns JWT token
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has password
    if (!user.password) {
      throw new BadRequestException('Password not set up. Please set up your password first.');
    }

    // Verify password using enhanced authentication
    const isPasswordValid = await this.enhancedAuthService.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user's organization access for JWT token in compact format
    const orgAccess = await this.organizationAccessService.getUserOrganizationAccessCompact(user.userId);
    const isGlobalAdmin = await this.organizationAccessService.isGlobalOrganizationAdmin(user.userId);

    // Generate enhanced JWT token with compact organization access
    const payload: EnhancedJwtPayload = { 
      sub: convertToString(user.userId), 
      email: user.email, 
      name: user.name,
      orgAccess, // Compact format: ["Porg-123", "Aorg-456"]
      isGlobalAdmin,
    };

    const token = this.jwtService.sign(payload);

    // Return minimal login response - only essential data
    return {
      access_token: token,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Setup password for first-time users
   */
  async setupPassword(setupPasswordDto: SetupPasswordDto) {
    const { email, newPassword } = setupPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if password is already set up
    if (user.password) {
      throw new ConflictException('Password already set up. Use change password instead.');
    }

    // Hash the new password using enhanced encryption
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    // Update user with new password
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password set up successfully',
    };
  }

  /**
   * Change password for existing users
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const userBigIntId = convertToBigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('Password not set up. Please set up your password first.');
    }

    // Verify current password using enhanced authentication
    const isCurrentPasswordValid = await this.enhancedAuthService.validatePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password using enhanced encryption
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { userId: userBigIntId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Validate JWT token and return user information
   */
  async validateUser(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }

  /**
   * Refresh organization access in JWT token
   * Call this after user joins/leaves organizations or role changes
   */
  async refreshUserToken(userId: string) {
    const userBigIntId = convertToBigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Get updated organization access in compact format
    const orgAccess = await this.organizationAccessService.getUserOrganizationAccessCompact(userId);
    const isGlobalAdmin = await this.organizationAccessService.isGlobalOrganizationAdmin(userId);

    // Generate new JWT token with updated compact access
    const payload: EnhancedJwtPayload = { 
      sub: convertToString(user.userId), 
      email: user.email, 
      name: user.name,
      orgAccess, // Compact format
      isGlobalAdmin,
    };

    const token = this.jwtService.sign(payload);

    // Return minimal refresh response - only essential data
    return {
      access_token: token,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
      },
    };
  }
}
