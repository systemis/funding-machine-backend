import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { POOL_ACTIVITY_QUEUE } from './dto/pool-activity.queue';
import { POOL_QUEUE } from './dto/pool.queue';
import { PORTFOLIO_QUEUE } from './dto/portfolio.queue';
import { PortfolioPublisher } from './portfolio/portfolio.publisher';
import { PortfolioProcessor } from './portfolio/portfolio.processor';
import { OrmModule } from '../orm/orm.module';
import { PortfolioService } from '../portfolio/services/portfolio.service';
import { PoolService } from '../pool/services/pool.service';
import { RegistryProvider } from '../providers/registry.provider';
import { MachineProcessor } from './machine/machine.processor';
import { MachinePublisher } from './machine/machine.publisher';
import { PoolActivityPublisher } from './machine-activity/pool-activity.publisher';
import { PoolActivityProcessor } from './machine-activity/pool-activity.processor';
import { PriceFeedPublisher } from './price-feed/price-feed.publisher';
import { SyncPriceService } from '../whitelist/services/sync-price.service';
import { CoinGeckoClient } from '../providers/coin-gecko.client';
import { NetworkProvider } from '../providers/network.provider';
import { StatisticPublisher } from './statistic/statistic.publisher';
import { SyncEvmPoolActivityService } from '../pool/services/sync-evm-pool-activity.service';
import { SyncEvmPoolService } from '../pool/services/sync-evm-pool.service';
import { StatisticsService } from '../statistics/services/statistics.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: POOL_ACTIVITY_QUEUE },
      { name: POOL_QUEUE },
      { name: PORTFOLIO_QUEUE },
    ),

    OrmModule,
  ],
  exports: [BullModule],
  providers: [
    /**
     * @dev Import services and providers
     */
    PortfolioService,
    PoolService,
    RegistryProvider,
    SyncPriceService,
    SyncEvmPoolService,
    SyncEvmPoolActivityService,
    StatisticsService,
    CoinGeckoClient,
    NetworkProvider,

    /**
     * @dev
     */
    PortfolioProcessor,
    PortfolioPublisher,
    MachineProcessor,
    MachinePublisher,
    PoolActivityPublisher,
    PoolActivityProcessor,
    PriceFeedPublisher,
    StatisticPublisher,
  ],
})
export class MqModule {}
