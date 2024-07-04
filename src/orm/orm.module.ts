import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PoolActivityModel,
  PoolActivitySchema,
} from './model/pool-activity.model';
import { PoolModel, PoolSchema } from './model/pool.model';
import {
  TokenMetadataModel,
  TokenMetadataSchema,
} from './model/token-metadata.model';
import { MarketDataSchema, MarketModel } from './model/market.model';
import { ImportAvaxcCommand } from './commands/import-avaxc.command';
import { WhitelistModel, WhitelistSchema } from './model/whitelist.model';
import { UserTokenModel, UserTokenSchema } from './model/user-token.model';
import { StatisticsModel, StatisticsSchema } from './model/statistic.model';
import { SyncStatusModel, SyncStatusSchema } from './model/sync-status.model';
import { UserDeviceModel, UserDeviceSchema } from './model/user-device.model';
import { AuthChallengeModel, AuthChallengeSchema } from './model/auth.model';

@Module({
  providers: [ImportAvaxcCommand],
  /**
   * @dev Declare models for the system to inject.
   */
  imports: [
    /**
     * @dev Use forFeature to declare models.
     */
    MongooseModule.forFeature([
      { name: PoolModel.name, schema: PoolSchema },
      { name: MarketModel.name, schema: MarketDataSchema },
      { name: WhitelistModel.name, schema: WhitelistSchema },
      { name: UserTokenModel.name, schema: UserTokenSchema },
      { name: StatisticsModel.name, schema: StatisticsSchema },
      { name: SyncStatusModel.name, schema: SyncStatusSchema },
      { name: UserDeviceModel.name, schema: UserDeviceSchema },
      { name: PoolActivityModel.name, schema: PoolActivitySchema },
      { name: AuthChallengeModel.name, schema: AuthChallengeSchema },
      { name: TokenMetadataModel.name, schema: TokenMetadataSchema },
    ]),
  ],
  exports: [
    /**
     * @dev Need to re-export again the Mongoose module for re-use in other modules.
     */
    MongooseModule,
  ],
})
export class OrmModule {}
