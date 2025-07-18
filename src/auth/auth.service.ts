import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import { LoginDto, SetupPasswordDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private enhancedAuthService: EnhancedAuthService,
  ) {}

  /**
   * User login - validates credentials and returns JWT token
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userAuth: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has set up password for this system
    if (!user.userAuth) {
      throw new BadRequestException('Password not set up. Please set up your password first.');
    }

    // Verify password using enhanced authentication
    const isPasswordValid = await this.enhancedAuthService.validatePassword(password, user.userAuth.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.prisma.userAuth.update({
      where: { userId: user.userId },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const payload = { 
      sub: user.userId, 
      email: user.email, 
      name: user.name 
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        userId: user.userId,
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
      include: { userAuth: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if password is already set up
    if (user.userAuth) {
      throw new ConflictException('Password already set up. Use change password instead.');
    }

    // Hash the new password using enhanced encryption
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    // Create user auth record
    await this.prisma.userAuth.create({
      data: {
        userId: user.userId,
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

    // Find user auth record
    const userAuth = await this.prisma.userAuth.findUnique({
      where: { userId },
    });

    if (!userAuth) {
      throw new BadRequestException('Password not set up. Please set up your password first.');
    }

    // Verify current password using enhanced authentication
    const isCurrentPasswordValid = await this.enhancedAuthService.validatePassword(currentPassword, userAuth.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password using enhanced encryption
    const hashedPassword = await this.enhancedAuthService.hashPassword(newPassword);

    // Update password
    await this.prisma.userAuth.update({
      where: { userId },
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
}
