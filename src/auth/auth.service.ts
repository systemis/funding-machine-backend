import { SignatureService } from '@/providers/signature.provider';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(private readonly signatureService: SignatureService) {}
}
