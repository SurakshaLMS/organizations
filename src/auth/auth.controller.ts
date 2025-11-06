import { Controller, Post, Body, Get, HttpCode, UseInterceptors, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService, LoginResponse } from './auth.service';
import { UltraCompactJwtService } from './services/ultra-compact-jwt.service';
import { LoginDto } from './dto/auth.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('Authentication')
@UseInterceptors(SecurityHeadersInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly ultraCompactJwtService: UltraCompactJwtService,
  ) {}

  /**
   * Login endpoint with strict rate limiting
   * Allows only 3 attempts per 5 minutes to prevent brute force attacks
   */
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes (300,000ms)
  @ApiOperation({ 
    summary: 'Login with ultra-compact JWT tokens', 
    description: 'Rate limited: 3 attempts per 5 minutes to prevent brute force attacks' 
  })
  @ApiResponse({ status: 200, description: 'Login successful with ultra-compact JWT token' })
  @ApiResponse({ status: 429, description: 'Too many login attempts - Please try again in 5 minutes' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }
}
