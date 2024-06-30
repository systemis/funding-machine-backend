import { Process, Processor } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  BUY_EVM_TOKEN_PROCESS,
  CLOSE_EVM_POSITION_PROCESS,
  POOL_QUEUE,
  SYNC_EVM_MACHINES,
} from '../dto/pool.queue';

import { PoolService } from '@/pool/services/pool.service';
import { ChainID, PoolStatus } from '@/pool/entities/pool.entity';
import { PoolDocument, PoolModel } from '@/orm/model/pool.model';
import { MarketModel } from '@/orm/model/market.model';
import { SyncEvmPoolService } from '@/pool/services/sync-evm-pool.service';
import { NotificationService } from '@/notification/services/notification.service';

@Processor(POOL_QUEUE)
export class MachineProcessor {
  constructor(
    private readonly poolService: PoolService,
    private readonly notificationService: NotificationService,
    private readonly evmSyncService: SyncEvmPoolService,
    @InjectModel(PoolModel.name)
    private readonly poolRepo: Model<PoolDocument>,
    @InjectModel(MarketModel.name)
    private readonly marketDataRepo: Model<MarketModel>,
  ) {}

  @Process(BUY_EVM_TOKEN_PROCESS)
  async buyEVMTokenJob() {
    try {
      console.log('BUY_EVM_TOKEN');
      const notifcationContent = {
        title: 'Token Swap Completed!',
        body: 'Check your portfolio for updated balances and performance details.',
      };
      const pools = await this.poolRepo
        .find({
          chainId: ChainID.AvaxC,
          status: PoolStatus.ACTIVE,
          nextExecutionAt: {
            $lte: new Date(),
          },
          startTime: {
            $lte: new Date(),
          },
        })
        .exec();

      console.log(
        `[${BUY_EVM_TOKEN_PROCESS}] Found ${pools.length} machine(s) ready to swap ...`,
      );

      await Promise.all(
        pools.map((pool) => {
          console.log('Executing swap for pool', pool._id);
          this.notificationService.sendNotificationToAddress(
            pool.ownerAddress,
            notifcationContent.title,
            notifcationContent.body,
          );
          return this.poolService
            .executeSwapTokenOnEVM(pool._id.toString(), pool.chainId)
            .then(() =>
              console.log(
                `[${BUY_EVM_TOKEN_PROCESS}] Executed swap for ${pool._id}`,
              ),
            )
            .catch((err) => {
              console.log(err);
              console.log(
                `[${BUY_EVM_TOKEN_PROCESS}] Failed to execute swap for ${pool._id}`,
              );
            });
        }),
      );
    } catch (e) {
      console.log(e);
    }
  }

  @Process(CLOSE_EVM_POSITION_PROCESS)
  async closeEVMPositions() {
    try {
      const pools = await this.poolRepo
        .find({
          chainId: ChainID.AvaxC,
          status: {
            $ne: PoolStatus.ACTIVE,
          },
          currentTargetTokenBalance: {
            $gt: 0,
          },
          startTime: {
            $lte: new Date(),
          },
        })
        .exec();

      console.log(
        `[${CLOSE_EVM_POSITION_PROCESS}] Found ${pools.length} machine(s) ready to swap for closing ...`,
      );

      await Promise.all(
        pools.map((pool) => {
          return this.poolService
            .executeClosingPositionOnEVM(pool._id.toString(), pool.chainId)
            .then(() =>
              console.log(
                `[${CLOSE_EVM_POSITION_PROCESS}] Executed swap for ${pool.id}`,
              ),
            )
            .catch(() =>
              console.log(
                `[${CLOSE_EVM_POSITION_PROCESS}] Failed to execute swap for ${pool.id}`,
              ),
            );
        }),
      );
    } catch (e) {
      console.log(e);
    }
  }

  @Process(SYNC_EVM_MACHINES)
  async syncEVMMachines() {
    console.log(`[${SYNC_EVM_MACHINES}] Started syncing evm pools ...`);

    try {
      await this.evmSyncService.syncPools();
    } catch (e) {
      console.log('ERROR::JOB_FAILED_TO_SYNC_MACHINES', e);
    }
  }
}
