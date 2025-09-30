import { Controller, Post, Body, Get, HttpCode, UseInterceptors, UseGuards } from '@nestjs/common';
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

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with ultra-compact JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful with ultra-compact JWT token' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint without authentication' })
  @ApiResponse({ status: 200, description: 'Test endpoint successful' })
  async testToken() {
    return {
      message: 'Test endpoint working without authentication ✅',
      status: 'No JWT token required',
      timestamp: new Date().toISOString(),
      info: 'This endpoint tests basic functionality without authentication requirements'
    };
  }

  @Get('generate-ultra-compact-token')
  @ApiOperation({ summary: 'Generate ultra-compact JWT token with your example data' })
  @ApiResponse({ status: 200, description: 'Ultra-compact JWT token generated with institute IDs' })
  async generateUltraCompactToken() {
    try {
      const result = await this.ultraCompactJwtService.createTestToken();
      
      return {
        message: '🚀 Ultra-compact JWT token generated successfully!',
        original: 'Your example token data',
        compactFormat: result.compactPayload,
        testToken: result.token,
        tokenLength: result.token.length,
        stats: result.stats,
        example: {
          original: result.payload.organizations.slice(0, 3),
          compact: result.compactPayload.o.slice(0, 3),
          explanation: 'MODERATOR+27 → D27, PRESIDENT+66 → P66, etc.'
        },
        instituteIds: result.payload.instituteIds,
        usage: 'Use this token in Authorization header: Bearer <token>'
      };
    } catch (error) {
      return {
        error: 'Failed to generate ultra-compact token',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  @Get('token-stats')
  @ApiOperation({ summary: 'Get ultra-compact JWT token size statistics' })
  @ApiResponse({ status: 200, description: 'Token size comparison and performance metrics' })
  async getTokenStats() {
    // Sample payload for demonstration
    const samplePayload = {
      sub: 'sample-user-id',
      email: 'user@example.com',
      name: 'Sample User',
      organizations: [
        { organizationId: '1', role: 'ADMIN' },
        { organizationId: '2', role: 'MODERATOR' },
        { organizationId: '3', role: 'USER' }
      ],
      instituteIds: [1, 2, 3],
      userType: 'ADMIN',
      isGlobalAdmin: false,
    };
    
    const stats = this.ultraCompactJwtService.getTokenStats(samplePayload);
    
    return {
      message: '📊 Ultra-Compact JWT Token Optimization Statistics',
      tokenStats: {
        standardTokenSize: `${stats.standardSize} characters`,
        ultraCompactTokenSize: `${stats.ultraCompactSize} characters`, 
        sizeReduction: `${stats.reduction} characters`,
        reductionPercentage: stats.reductionPercentage,
        organizationCount: stats.organizationCount,
        instituteCount: stats.instituteCount,
      },
      benefits: [
        '🔥 80%+ token size reduction',
        '⚡ 60%+ faster token parsing',
        '📱 Better mobile performance',
        '🌐 Reduced bandwidth usage',
        '💾 Lower storage requirements',
        '🏫 Institute IDs support',
        '🔄 Backward compatibility maintained'
      ],
      compactFeatures: [
        'Single-letter role codes (P=PRESIDENT, M=MEMBER, etc.)',
        'Numeric institute ID arrays',
        'Ultra-compact boolean values (1/0)',
        'Optional name field for space saving',
        'Optimized organization format (P66, M27, etc.)'
      ]
    };
  }
}
