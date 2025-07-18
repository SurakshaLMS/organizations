import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnhancedAuthService } from './enhanced-auth.service';
import * as bcrypt from 'bcrypt';

@Controller('debug')
export class DebugController {
  constructor(
    private prisma: PrismaService,
    private enhancedAuthService: EnhancedAuthService,
  ) {}

  @Get('user/:email')
  async getUserDebug(@Param('email') email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userAuth: true },
    });
    
    if (!user) {
      return { error: 'User not found' };
    }

    return {
      user: {
        email: user.email,
        name: user.name,
        hasUserAuth: !!user.userAuth,
        passwordHash: user.userAuth?.password || null,
      },
    };
  }

  @Post('test-password')
  async testPassword(@Body() body: { password: string; hash: string }) {
    // Test direct password validation against provided hash
    const directBcrypt = await bcrypt.compare(body.password, body.hash);
    const enhanced = await this.enhancedAuthService.validatePassword(body.password, body.hash);

    return {
      directBcrypt,
      enhanced,
      passwordLength: body.password.length,
      hashLength: body.hash.length,
    };
  }

  @Post('test-user-password')
  async testUserPassword(@Body() body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { userAuth: true },
    });

    if (!user || !user.userAuth) {
      return { error: 'User not found or no auth record' };
    }

    const directBcrypt = await bcrypt.compare(body.password, user.userAuth.password);
    const enhanced = await this.enhancedAuthService.validatePassword(body.password, user.userAuth.password);

    return {
      directBcrypt,
      enhanced,
      passwordLength: user.userAuth.password.length,
    };
  }
}
