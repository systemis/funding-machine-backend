import { Module } from '@nestjs/common';
import { OrmModule } from '@/orm/orm.module';
import { RegistryProvider } from '@/providers/registry.provider';
import { PoolController } from './controllers/pool.controller';
import { PoolMockService } from './services/pool-mock.service';
import { PoolService } from './services/pool.service';
import { PortfolioService } from '@/portfolio/services/portfolio.service';
import { PoolActivityService } from './services/pool-activity.service';
import { MigrateChainIdCommand } from './commands/migrate-chain-id';
import { SyncEvmPoolActivityService } from './services/sync-evm-pool-activity.service';
import { SyncEvmPoolService } from './services/sync-evm-pool.service';
import { EVMPoolController } from './controllers/evm-pool.controller';
import { FixDecimalsEventData } from './commands/fix-decimals-event-data';

@Module({
  imports: [OrmModule],
  providers: [
    RegistryProvider,
    PoolService,
    PoolMockService,
    PoolActivityService,
    PortfolioService,
    SyncEvmPoolActivityService,
    SyncEvmPoolService,

    /**
     * Import commands
     * These commands are used to run some specific tasks
     */
    MigrateChainIdCommand,
    FixDecimalsEventData,
  ],
  controllers: [PoolController, EVMPoolController],
})
export class PoolModule {}
