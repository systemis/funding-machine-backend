import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignatureService } from '@/providers/signature.provider';

@Module({
  controllers: [AuthController],
  providers: [SignatureService, AuthService],
})
export class AuthModule {}
