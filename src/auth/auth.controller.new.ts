import { Controller, Post, Body, Get, HttpCode } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any) {
    return { message: 'Login endpoint working!', body };
  }

  @Get('test')
  async test() {
    return { message: 'Auth controller is working!' };
  }
}
