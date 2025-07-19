import { Module } from '@nestjs/common';
import { InstituteUserController } from './institute-user.controller';
import { InstituteUserService } from './institute-user.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InstituteUserController],
  providers: [InstituteUserService],
  exports: [InstituteUserService],
})
export class InstituteModule {}
