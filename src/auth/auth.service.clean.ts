import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
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
  private readonly encryptionKey: string;
  private readonly ivLength: number;
  private readonly saltRounds: number;

  // Helper function to get full name from firstName and lastName
  private getFullName(user: { firstName: string; lastName?: string | null }): string {
    return `${user.firstName} ${user.lastName || ''}`.trim();
  }

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private organizationAccessService: OrganizationAccessService,
  ) {
    // Initialize security settings from .env
    this.pepper = this.configService.get<string>('BCRYPT_PEPPER') || 'default-pepper-change-in-production';
    this.encryptionKey = this.configService.get<string>('PASSWORD_ENCRYPTION_KEY') || 'default-key-32-chars-min-length!';
    this.ivLength = parseInt(this.configService.get<string>('PASSWORD_ENCRYPTION_IV_LENGTH') || '16');
    this.saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS') || '12');
  }

  /**
   * Enhanced login with optimized password validation
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;
    
    this.logger.log(`🔐 Login attempt for: ${email}`);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password is set
    if (!user.password) {
      return {
        access_token: '',
        user: {
          id: convertToString(user.userId),
          email: user.email,
          name: this.getFullName(user),
          isFirstLogin: true
        },
        permissions: {
          organizations: [],
          isGlobalAdmin: false
        },
        needsPasswordSetup: true
      };
    }

    // Validate password
    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user permissions
    const [orgAccess, isGlobalAdmin] = await Promise.all([
      this.organizationAccessService.getUserOrganizationAccessCompact(user.userId),
      this.organizationAccessService.isGlobalOrganizationAdmin(user.userId)
    ]);

    // Create JWT payload
    const payload: EnhancedJwtPayload = { 
      sub: convertToString(user.userId), 
      email: user.email, 
      name: this.getFullName(user),
      orgAccess,
      isGlobalAdmin,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = this.jwtService.sign(payload);

    // Update last login
    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { 
        updatedAt: new Date()
      }
    });

    this.logger.log(`✅ Login successful for: ${email}`);

    return {
      access_token: token,
      user: {
        id: convertToString(user.userId),
        email: user.email,
        name: this.getFullName(user),
        lastLoginAt: new Date()
      },
      permissions: {
        organizations: orgAccess.map(org => org),
        isGlobalAdmin
      }
    };
  }

  /**
   * Clean password validation with fallback support
   */
  private async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      // Method 1: Direct bcrypt comparison (most common)
      const directMatch = await bcrypt.compare(plainPassword, hashedPassword);
      if (directMatch) {
        return true;
      }

      // Method 2: Peppered password comparison
      const pepperedPassword = this.createPepperedPassword(plainPassword);
      const pepperedMatch = await bcrypt.compare(pepperedPassword, hashedPassword);
      if (pepperedMatch) {
        return true;
      }

      // Method 3: Try encrypted password format
      const decryptedPassword = this.decryptPassword(hashedPassword);
      if (decryptedPassword && decryptedPassword === plainPassword) {
        return true;
      }

      return false;

    } catch (error) {
      this.logger.error('Password validation error:', error);
      return false;
    }
  }

  /**
   * Hash password with bcrypt and pepper
   */
  async hashPassword(password: string): Promise<string> {
    const pepperedPassword = this.createPepperedPassword(password);
    return bcrypt.hash(pepperedPassword, this.saltRounds);
  }

  /**
   * Encrypt password using AES encryption
   */
  encryptPassword(password: string): string {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      this.logger.error('Password encryption error:', error);
      throw new BadRequestException('Password encryption failed');
    }
  }

  /**
   * Decrypt password using AES decryption
   */
  decryptPassword(encryptedData: string): string | null {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        return null; // Not encrypted format
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.slice(0, 32)), iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      return null; // Not encrypted or invalid format
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
   * Setup password for first-time users
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
    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userId: user.userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
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
    const isCurrentPasswordValid = await this.validatePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

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
      name: this.getFullName(user),
      institutes: user.instituteUsers.map(iu => ({
        instituteId: convertToString(iu.institute.instituteId),
        name: iu.institute.name,
        status: iu.status, // Use status instead of role/isActive
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
      name: this.getFullName(user),
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
      name: this.getFullName(user),
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
        name: this.getFullName(user),
      },
    };
  }
}
