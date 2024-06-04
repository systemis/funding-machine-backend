import { Injectable } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { WhitelistDocument, WhitelistModel } from '@/orm/model/whitelist.model';
import {
  SyncStatusDocument,
  SyncStatusModel,
} from '@/orm/model/sync-status.model';
import { ChainID } from '@/pool/entities/pool.entity';
import { EntityType } from '@/whitelist/entities/whitelist.entity';

@Injectable()
@Command({ name: 'import-avaxc' })
export class ImportAvaxcCommand extends CommandRunner {
  constructor(
    @InjectModel(WhitelistModel.name)
    private readonly whitelistModel: Model<WhitelistDocument>,

    @InjectModel(SyncStatusModel.name)
    private readonly syncStatus: Model<SyncStatusDocument>,
  ) {
    super();
  }

  public async run(): Promise<void> {
    console.log('Importing AVAXC whitelist and sync status');
    return await this.process();
  }

  private async process(): Promise<void> {
    console.log('Importing AVAXC whitelist and sync status');

    // create sync status for avaxc
    await this.syncStatus.create({
      chainId: ChainID.AvaxC,
      syncedBlock: 46034313,
      blockDiff: 2000,
      startingBlock: 46034313,
    });

    await this.whitelistModel.create({
      address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      decimals: 18,
      entityType: EntityType.TOKEN,
      image:
        'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
      name: 'Wrapped AVAX',
      symbol: 'AVAX',
      estimatedValue: 0.406489,
      chainId: ChainID.AvaxC,
      coingeckoId: 'avalanche-2',
      isNativeCoin: true,
    });

    await this.whitelistModel.create({
      address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
      decimals: 18,
      entityType: EntityType.TOKEN,
      image:
        'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png?1696501400',
      name: 'Wrapped Bitcoin',
      symbol: 'BTC',
      estimatedValue: 0.406489,
      chainId: ChainID.AvaxC,
      coingeckoId: 'bitcoin',
      isNativeCoin: true,
    });
  }
}
