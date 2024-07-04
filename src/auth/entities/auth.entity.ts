export class AuthChallengeEntity {
  challenge: string;
  isResolved: boolean;
  walletAddress: string;
}

export class AuthEntity {
  email: string;
  walletAddress: string;
}
