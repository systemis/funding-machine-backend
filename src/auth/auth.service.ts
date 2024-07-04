import {
  AuthChallengeDocument,
  AuthChallengeModel,
} from '@/orm/model/auth.model';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AuthChallengeModel.name)
    private readonly authChallengeRepo: Model<AuthChallengeDocument>,
  ) {}

  /**
   * @dev Find one challenge by wallet address and challenge.
   * @param walletAddress
   */
  async findOne(walletAddress: string, challenge: string) {
    return await this.authChallengeRepo.findOne({
      walletAddress,
      challenge,
      isResolved: false,
    });
  }

  /**
   * @dev Create new challenge.
   * @param walletAddress
   * @param challenge
   */
  async create(walletAddress: string, challenge: string) {
    return await this.authChallengeRepo.create({
      challenge,
      walletAddress,
      isResolved: false,
    });
  }
}
