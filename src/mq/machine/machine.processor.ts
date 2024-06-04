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

@Processor(POOL_QUEUE)
export class MachineProcessor {
  constructor(
    private readonly poolService: PoolService,
    private readonly evmSyncService: SyncEvmPoolService,
    @InjectModel(PoolModel.name)
    private readonly poolRepo: Model<PoolDocument>,
    @InjectModel(MarketModel.name)
    private readonly marketDataRepo: Model<MarketModel>,
  ) {}

  @Process(BUY_EVM_TOKEN_PROCESS)
  async buyEVMTokenJob() {
    try {
      /**
       * @dev Filter all proper pools
       */
      const pools = await this.poolRepo
        .find({
          $and: [
            { chainId: { $ne: ChainID.Solana } },
            { chainId: { $ne: ChainID.AptosTestnet } },
            { chainId: { $ne: ChainID.AptosMainnet } },
          ],
          status: PoolStatus.ACTIVE,
          /**
           * @dev Date filtering
           */
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

      /**
       * @dev Execute jobs
       */
      await Promise.all(
        pools.map((pool) => {
          /**
           * @dev Execute on EVM
           */
          return this.poolService
            .executeSwapTokenOnEVM(pool._id.toString(), pool.chainId)
            .then(() =>
              console.log(
                `[${BUY_EVM_TOKEN_PROCESS}] Executed swap for ${pool.id}`,
              ),
            )
            .catch(() =>
              console.log(
                `[${BUY_EVM_TOKEN_PROCESS}] Failed to execute swap for ${pool.id}`,
              ),
            );
        }),
      );
    } catch (e) {
      console.log(e);
    }
  }

  @Process(CLOSE_EVM_POSITION_PROCESS)
  async closeEVMPositions() {
    try {
      /**
       * @dev Filter all proper pools
       */
      const pools = await this.poolRepo
        .find({
          $and: [
            { chainId: { $ne: ChainID.Solana } },
            { chainId: { $ne: ChainID.AptosTestnet } },
            { chainId: { $ne: ChainID.AptosMainnet } },
          ],
          status: {
            $ne: PoolStatus.ENDED,
          },
          /**
           * @dev Date filtering
           */
          currentTargetTokenBalance: {
            $gt: 0,
          },
          startTime: {
            $lte: new Date(),
          },
        })
        .exec();

      console.log(
        `[${CLOSE_EVM_POSITION_PROCESS}] Found ${pools.length} machine(s) ready to swap ...`,
      );

      /**
       * @dev Execute jobs
       */
      await Promise.all(
        pools.map((pool) => {
          /**
           * @dev Execute on EVM
           */
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
