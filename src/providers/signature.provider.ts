import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

export interface Signer {
  verify: (
    message: string,
    signedData: string,
    walletAddress: string,
  ) => boolean;
}

@Injectable()
export class SignatureService {
  /**
   * @dev Get signer.
   * @returns Signer
   */
  getSigner(): Signer {
    return new EVMSigner();
  }
}

class EVMSigner implements Signer {
  /**
   * @dev Verify the signature of a message.
   * @param message
   * @param signedData
   * @param walletAddress
   * @returns boolean
   * @throws Error
   * @throws TypeError
   */
  verify(message: string, signedData: string, walletAddress): boolean {
    const web3 = new Web3();
    const address = web3.eth.accounts.recover(message, signedData, false);
    console.log('address when verifying signature: ', address);
    return address === walletAddress;
  }
}
