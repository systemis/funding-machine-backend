export class AuthChallengeEntity {
  challenge: string;
  resolved: boolean;
  walletAddress: string;
}

export class AuthEntity {
  email: string;
  walletAddress: string;
}
