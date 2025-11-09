import { 
  Injectable, 
  BadRequestException, 
  UnauthorizedException,
  NotFoundException,
  ConflictException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UltraCompactJwtService } from './services/ultra-compact-jwt.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RefreshTokenDto, SetupPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { convertToBigInt, convertToString } from '../utils/bigint.utils';
import * as crypto from 'crypto';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    organizations: {
      organizationId: string;
      role: string;
    }[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly ultraCompactJwtService: UltraCompactJwtService,
  ) {}

  private readonly logger = {
    log: (message: string) => this.logger.log(message),
    warn: (message: string) => console.warn(`[AUTH WARNING] ${message}`),
    error: (message: string) => console.error(`[AUTH ERROR] ${message}`),
  };

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;
      
      // Validate user exists
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          organizationUsers: {
            select: {
              organizationId: true,
              role: true,
              isVerified: true,
            },
          },
        },
      });

      if (!user) {
        this.logger.error(`User not found: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Validate password
      const isPasswordValid = await this.validatePassword(password, user.password);
      
      if (!isPasswordValid) {
        this.logger.error(`Invalid password for user: ${email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if account is active
      if (!user.isActive) {
        this.logger.error(`Inactive account: ${email}`);
        throw new UnauthorizedException('Account is deactivated');
      }

      // Create ultra-compact JWT payload with institute IDs
      const payload = {
        sub: convertToString(user.userId),
        email: user.email,
        name: this.getFullName(user),
        organizations: user.organizationUsers.filter(uo => uo.isVerified).map(uo => ({
          organizationId: convertToString(uo.organizationId),
          role: uo.role,
        })),
        // Get institute IDs for this user 
        instituteIds: await this.getUserInstituteIds(user.userId),
      };

      // Generate ultra-compact tokens
      const accessToken = await this.ultraCompactJwtService.signUltraCompact(payload);
      const refreshToken = await this.ultraCompactJwtService.signUltraCompact(payload, { expiresIn: '7d' });

      this.logger.log(`✅ Ultra-compact JWT login successful for: ${email}`);
      
      if (payload.instituteIds && payload.instituteIds.length > 0) {
        this.logger.log(`🏫 User has access to institutes: [${payload.instituteIds.join(', ')}]`);
      }

      return {
        accessToken,
        refreshToken,
        user: {
          id: convertToString(user.userId),
          email: user.email,
          name: this.getFullName(user),
          organizations: user.organizationUsers.filter(uo => uo.isVerified).map(uo => ({
            organizationId: convertToString(uo.organizationId),
            role: uo.role,
          })),
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login error: ${error.message}`);
      throw new UnauthorizedException('Login failed');
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;
      
      const decoded = this.jwtService.verify(refreshToken);
      const userId = decoded.sub;

      const user = await this.prisma.user.findUnique({
        where: { userId: convertToBigInt(userId) },
        include: {
          organizationUsers: {
            select: {
              organizationId: true,
              role: true,
              isVerified: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const payload = {
        sub: convertToString(user.userId),
        email: user.email,
        name: this.getFullName(user),
        organizations: user.organizationUsers.filter(uo => uo.isVerified).map(uo => ({
          organizationId: convertToString(uo.organizationId),
          role: uo.role,
        })),
      };

      const newAccessToken = this.jwtService.sign(payload);

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ENHANCED PASSWORD VALIDATION WITH LAAS COMPATIBILITY
  async validatePassword(plainTextPassword: string, hashedPassword: string | null): Promise<boolean> {
    if (!hashedPassword) {
      this.logger.error('No hashed password provided for validation');
      return false;
    }

    try {
      // ✅ SECURITY: Development password bypass - ONLY in development with explicit flag
      if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_BYPASS === 'true') {
        const devPasswords = ['Password123@', 'laas123', 'admin123', 'temp123'];
        if (devPasswords.includes(plainTextPassword)) {
          this.logger.warn(`⚠️ DEV BYPASS USED for password: ${plainTextPassword} - DO NOT USE IN PRODUCTION`);
          return true;
        }
      }

      // Method 1: Direct bcrypt validation WITHOUT pepper (most common)
      if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$') || hashedPassword.startsWith('$2y$')) {
        const isValid = await bcrypt.compare(plainTextPassword, hashedPassword);
        if (isValid) {
          this.logger.log('✅ Password validated via direct bcrypt (no pepper)');
          return true;
        }
        
        // Method 1b: Try with BCRYPT_PEPPER if direct comparison failed
        const pepper = process.env.BCRYPT_PEPPER || process.env.PASSWORD_PEPPER || '';
        if (pepper) {
          const pepperedPassword = plainTextPassword + pepper;
          const isValidWithPepper = await bcrypt.compare(pepperedPassword, hashedPassword);
          if (isValidWithPepper) {
            this.logger.log('✅ Password validated with BCRYPT_PEPPER');
            return true;
          }
        }
      }

      // Method 3: Try AES decryption if it looks encrypted
      if (process.env.AES_SECRET && hashedPassword.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(hashedPassword)) {
        try {
          const key = crypto.createHash('sha256').update(process.env.AES_SECRET).digest();
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16));
          let decrypted = decipher.update(hashedPassword, 'base64', 'utf8');
          decrypted += decipher.final('utf8');
          
          if (decrypted === plainTextPassword) {
            this.logger.log('✅ Password validated via AES decryption');
            return true;
          }
        } catch (aesError) {
          // AES decryption failed, continue to other methods
        }
      }

      // Method 4: LaaS compatibility check
      if (hashedPassword.startsWith('$2b$12$')) {
        // Try common LaaS password patterns
        const laasPatterns = [
          plainTextPassword,
          plainTextPassword.toLowerCase(),
          plainTextPassword.toUpperCase(),
          'laas' + plainTextPassword,
          plainTextPassword + 'laas'
        ];

        for (const pattern of laasPatterns) {
          const isValid = await bcrypt.compare(pattern, hashedPassword);
          if (isValid) {
            this.logger.log(`✅ Password validated via LaaS pattern: ${pattern}`);
            return true;
          }
        }
      }

      this.logger.error(`Password validation failed for hash: ${hashedPassword.substring(0, 20)}...`);
      return false;

    } catch (error) {
      this.logger.error(`Password validation error: ${error.message}`);
      return false;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async setupPassword(setupPasswordDto: SetupPasswordDto) {
    const { email, newPassword } = setupPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      throw new ConflictException('Password already set. Use change password instead.');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { 
        password: hashedPassword,
      },
    });

    this.logger.log(`✅ Password setup completed for: ${email}`);

    return {
      message: 'Password set up successfully',
      user: {
        id: convertToString(user.userId),
        email: user.email,
        name: this.getFullName(user)
      }
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const userBigIntId = convertToBigInt(userId);
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await this.validatePassword(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userId: userBigIntId },
      data: { password: hashedPassword },
    });

    this.logger.log(`✅ Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  async getUserProfile(userId: string) {
    const userBigIntId = convertToBigInt(userId);
    
    const user = await this.prisma.user.findUnique({
      where: { userId: userBigIntId },
      include: {
        organizationUsers: {
          include: {
            organization: {
              select: {
                organizationId: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: convertToString(user.userId),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: this.getFullName(user),
      organizations: user.organizationUsers.map(uo => ({
        organizationId: convertToString(uo.organizationId),
        organizationName: uo.organization.name,
        organizationType: uo.organization.type,
        role: uo.role,
        isVerified: uo.isVerified,
      })),
    };
  }

  private getFullName(user: any): string {
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.email;
  }

  // Passport strategy support methods
  async validateUser(email: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return {
      userId: convertToString(user.userId),
      email: user.email,
      name: this.getFullName(user),
    };
  }

  // JWT strategy support
  async validateJwtUser(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      organizations: payload.organizations || [],
    };
  }

  async refreshUserToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId: convertToBigInt(userId) },
      include: {
        organizationUsers: {
          select: {
            organizationId: true,
            role: true,
            isVerified: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const payload = {
      sub: convertToString(user.userId),
      email: user.email,
      name: this.getFullName(user),
      organizations: user.organizationUsers.filter(uo => uo.isVerified).map(uo => ({
        organizationId: convertToString(uo.organizationId),
        role: uo.role,
      })),
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  /**
   * Get institute IDs that a user has access to
   * ✅ SECURITY: Using type-safe Prisma query builder instead of raw SQL
   */
  private async getUserInstituteIds(userId: bigint): Promise<number[]> {
    try {
      // Use Prisma's type-safe query builder
      const instituteUsers = await this.prisma.instituteUser.findMany({
        where: { 
          userId: userId 
        },
        select: { 
          instituteId: true 
        },
        orderBy: { 
          createdAt: 'desc' 
        }
      });

      // Extract institute IDs from the query results
      const instituteIds = instituteUsers.map(iu => Number(iu.instituteId));
      
      if (instituteIds.length > 0) {
        this.logger.log(`🏫 User ${userId} enrolled in institutes: [${instituteIds.join(', ')}]`);
      }

      return instituteIds;
    } catch (error) {
      this.logger.error(`Error getting institute IDs for user ${userId}: ${error.message}`);
      return [];
    }
  }
}
