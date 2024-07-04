import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/challenge')
  async createChallenge(
    @Body() createChallengeDto: { walletAddress: string; challenge: string },
  ) {
    // Create challenge
    return await this.authService.create(
      createChallengeDto.walletAddress,
      createChallengeDto.challenge,
    );
  }
}
