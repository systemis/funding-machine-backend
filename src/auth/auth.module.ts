import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignatureService } from '@/providers/signature.provider';
import { OrmModule } from '@/orm/orm.module';

@Module({
  imports: [OrmModule],
  controllers: [AuthController],
  providers: [SignatureService, AuthService],
})
export class AuthModule {}
