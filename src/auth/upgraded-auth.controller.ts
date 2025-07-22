import { Controller, Post, Body, Get, UseGuards, Request, Put, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard } from '@nestjs/throttler';
import { UpgradedAuthService, LoginResponse } from './upgraded-auth.service';
import { LoginDto, SetupPasswordDto, ChangePasswordDto } from './dto/auth.dto';

/**
 * Enhanced Authentication Controller
 * Supports LAAS synced users with password compatibility
 */
@Controller('auth')
export class UpgradedAuthController {
  constructor(private upgradedAuthService: UpgradedAuthService) {}

  /**
   * Enhanced user login with LAAS compatibility
   * Supports multiple password formats and auto-migration
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.upgradedAuthService.login(loginDto);
  }

  /**
   * Setup password for first-time users synced from LAAS
   * Used when user exists but has no password set
   */
  @Post('setup-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async setupPassword(@Body() setupPasswordDto: SetupPasswordDto) {
    return this.upgradedAuthService.setupPassword(setupPasswordDto);
  }

  /**
   * Change password for authenticated users
   * Requires current password for security
   */
  @Put('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.upgradedAuthService.changePassword(req.user.sub, changePasswordDto);
  }

  /**
   * Get user profile with institute and organization information
   * Returns complete user profile including synced data
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req) {
    return this.upgradedAuthService.getUserProfile(req.user.sub);
  }

  /**
   * Validate if user exists and check password setup status
   * Useful for checking if user needs password setup
   */
  @Post('validate-user')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async validateUser(@Body() body: { email: string }) {
    const user = await this.upgradedAuthService.validateUser(body.email);
    return {
      exists: !!user,
      user: user || null
    };
  }

  /**
   * Get current authenticated user information
   * Returns JWT payload data
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Request() req) {
    return req.user;
  }

  /**
   * Check authentication status
   * Simple endpoint to verify if user is authenticated
   */
  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getAuthStatus(@Request() req) {
    return {
      authenticated: true,
      user: {
        id: req.user.sub,
        email: req.user.email,
        name: req.user.name
      },
      timestamp: new Date().toISOString()
    };
  }
}
