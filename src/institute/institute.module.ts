import { Module } from '@nestjs/common';
import { InstituteUserController } from './institute-user.controller';
import { InstituteUserService } from './institute-user.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InstituteUserController],
  providers: [InstituteUserService],
  exports: [InstituteUserService],
})
export class InstituteModule {}
