import { Controller, Post, Body, Get, HttpCode, UseInterceptors } from '@nestjs/common';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import { SecurityHeadersInterceptor } from '../common/interceptors/security-headers.interceptor';

@Controller('auth')
@UseInterceptors(SecurityHeadersInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Get('test')
  async test() {
    return { message: 'Auth controller is working!' };
  }
}
