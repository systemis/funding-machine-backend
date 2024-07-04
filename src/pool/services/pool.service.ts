import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, PipelineStage } from 'mongoose';

import { CommonQueryDto } from '@/api-docs/dto/common-query.dto';
import { PoolModel, PoolDocument } from '@/orm/model/pool.model';
import { FindPoolDto, FindPoolSortOption } from '../dtos/find-pool.dto';
import { ChainID, PoolEntity, TradingStopType } from '../entities/pool.entity';
import { MarketModel } from '@/orm/model/market.model';
import { EVMBasedMachineProvider } from '@/providers/evm-machine-program/evm.provider';

import { SyncEvmPoolService } from './sync-evm-pool.service';
import { WhitelistDocument, WhitelistModel } from '@/orm/model/whitelist.model';
import { UtilsProvider } from '@/providers/utils.provider';

@Injectable()
export class PoolService {
  constructor(
    private readonly syncEVMService: SyncEvmPoolService,
    @InjectModel(PoolModel.name)
    private readonly poolRepo: Model<PoolDocument>,
    @InjectModel(MarketModel.name)
    private readonly marketDataRepo: Model<MarketModel>,
    @InjectModel(WhitelistModel.name)
    private readonly whitelistRepo: Model<WhitelistDocument>,
  ) {}

  async find(
    {
      chainId,
      search,
      limit,
      offset,
      ownerAddress,
      sortBy,
      statuses,
    }: CommonQueryDto & FindPoolDto,
    formatDecimals = false,
  ): Promise<PoolEntity[]> {
    const stages: PipelineStage[] = [];
    /** Map pool stage */
    stages.push({
      $addFields: {
        idString: {
          $toString: '$_id',
        },
      },
    });

    stages.push({
      $lookup: {
        from: 'whitelists',
        as: 'baseTokenInfo',
        localField: 'baseTokenAddress',
        foreignField: 'address',
      },
    });

    stages.push({
      $lookup: {
        from: 'whitelists',
        as: 'targetTokenInfo',
        localField: 'targetTokenAddress',
        foreignField: 'address',
      },
    });

    /** Filter & search stage */
    const filter: FilterQuery<PoolDocument> = {
      ownerAddress: { $regex: new RegExp(ownerAddress, 'i') },
      chainId,
    };

    if (search) {
      const regexSearch = new RegExp(search, 'i');

      /**
       * @dev Base token info
       */
      filter.$or = [
        /**
         * @dev Base token info
         */
        {
          'baseTokenInfo.address': {
            $regex: regexSearch,
          },
        },
        {
          'baseTokenInfo.symbol': {
            $regex: regexSearch,
          },
        },
        {
          'baseTokenInfo.name': {
            $regex: regexSearch,
          },
        },
        /**
         * @dev Target token info
         */
        {
          'targetTokenInfo.address': {
            $regex: regexSearch,
          },
        },
        {
          'targetTokenInfo.symbol': {
            $regex: regexSearch,
          },
        },
        {
          'targetTokenInfo.name': {
            $regex: regexSearch,
          },
        },
        {
          name: {
            $regex: regexSearch,
          },
        },
        {
          idString: {
            $regex: regexSearch,
          },
        },
      ];
    }

    if (statuses && statuses.length >= 0) {
      filter.status = { $in: statuses };
    }

    stages.push({ $match: filter });

    /** Sort stage */
    switch (sortBy) {
      case FindPoolSortOption.DATE_START_DESC:
        stages.push({ $sort: { startTime: -1 } });
        break;
      case FindPoolSortOption.DATE_CREATED_DESC:
        stages.push({ $sort: { createdAt: -1 } });
        break;
      case FindPoolSortOption.PROGRESS_ASC:
      case FindPoolSortOption.PROGRESS_DESC:
        /** Sort progress stage */
        stages.push({
          $sort: {
            progressPercent:
              sortBy === FindPoolSortOption.PROGRESS_ASC ? 1 : -1,
          },
        });
        break;

      case FindPoolSortOption.TARGET_TOKEN_AMOUNT_DESC:
      case FindPoolSortOption.TARGET_TOKEN_AMOUNT_ASC:
        /** Sort target token amount stage */
        stages.push({
          $sort: {
            currentReceivedTargetToken:
              sortBy === FindPoolSortOption.TARGET_TOKEN_AMOUNT_DESC ? -1 : 1,
          },
        });
        break;

      case FindPoolSortOption.CURRENT_SPENT_BASE_TOKEN_AMOUNT_DESC:
      case FindPoolSortOption.CURRENT_SPENT_BASE_TOKEN_AMOUNT_ASC:
        /** Sort current spent base token amount stage */
        stages.push({
          $sort: {
            currentSpentBaseToken:
              sortBy === FindPoolSortOption.CURRENT_SPENT_BASE_TOKEN_AMOUNT_DESC
                ? -1
                : 1,
          },
        });
        break;
    }

    /** Paginate stage */
    stages.push({ $skip: offset }, { $limit: limit });

    const result = await this.poolRepo.aggregate<PoolDocument>(stages).exec();

    if (formatDecimals) {
      return result.map((elm) => {
        if ((elm as any).baseTokenInfo[0] && (elm as any).targetTokenInfo[0]) {
          return this.getDisplayedDecimalsData(
            elm,
            (elm as any).baseTokenInfo[0] as WhitelistDocument,
            (elm as any).targetTokenInfo[0] as WhitelistDocument,
          );
        }
        return elm;
      }) as unknown as PoolDocument[];
    }

    return result;
  }

  /**
   * @dev Create empty pool
   * @param ownerAddress
   * @param chainId
   */
  async createEmpty(ownerAddress: string, chainId: ChainID) {
    const [doc] = await this.poolRepo.create(
      [
        {
          ownerAddress,
          chainId,
          currentReceivedTargetToken: 0,
          currentSpentBaseToken: 0,
        },
      ],
      {
        validateBeforeSave: false,
      },
    );

    return doc;
  }

  /**
   * @dev Get pool details
   * @param id
   */
  async getPoolDetailWithDecimalsFormatted(id: string) {
    const pool = await this.poolRepo.findById(id).exec();

    if (!pool) {
      throw new NotFoundException('OBJECT_NOT_FOUND');
    }

    const baseTokenInfo = await this.whitelistRepo.findOne({
      address: pool.baseTokenAddress,
    });
    const targetTokenInfo = await this.whitelistRepo.findOne({
      address: pool.targetTokenAddress,
    });

    return this.getDisplayedDecimalsData(
      (pool as any)._doc as PoolDocument,
      baseTokenInfo,
      targetTokenInfo,
    );
  }

  /**
   * @dev Get pool details
   * @param id
   */
  async getPoolDetail(id: string) {
    const pool = await this.poolRepo.findById(id).exec();

    if (!pool) {
      throw new NotFoundException('OBJECT_NOT_FOUND');
    }

    return pool;
  }

  private getDisplayedDecimalsData(
    pool: PoolDocument,
    baseTokenInfo: WhitelistDocument,
    targetTokenInfo: WhitelistDocument,
  ) {
    if (pool.buyCondition) {
      (pool as any).buyCondition.value = pool.buyCondition.value.map((value) =>
        new UtilsProvider().getDisplayedDecimals(
          value / 10 ** targetTokenInfo.decimals,
        ),
      );
    }

    if (pool.stopConditions && pool.stopConditions.receivedTargetTokenReach) {
      (pool as any).stopConditions.receivedTargetTokenReach =
        new UtilsProvider().getDisplayedDecimals(
          pool.stopConditions.receivedTargetTokenReach /
            10 ** targetTokenInfo.decimals,
        );
    }

    if (pool.stopConditions && pool.stopConditions.spentBaseTokenReach) {
      (pool as any).stopConditions.spentBaseTokenReach =
        new UtilsProvider().getDisplayedDecimals(
          pool.stopConditions.spentBaseTokenReach /
            10 ** baseTokenInfo.decimals,
        );
    }

    if (
      pool.stopLossCondition &&
      pool.stopLossCondition.stopType === TradingStopType.Price
    ) {
      (pool as any).stopLossCondition.value =
        new UtilsProvider().getDisplayedDecimals(
          Number(pool.stopLossCondition.value) / 10 ** baseTokenInfo.decimals,
        );
    }

    if (
      pool.takeProfitCondition &&
      pool.takeProfitCondition.stopType === TradingStopType.Price
    ) {
      (pool as any).takeProfitCondition.value =
        new UtilsProvider().getDisplayedDecimals(
          Number(pool.takeProfitCondition.value) / 10 ** baseTokenInfo.decimals,
        );
    }

    return {
      ...pool,
      currentROI: new UtilsProvider().getDisplayedDecimals(
        pool.currentROI || 0,
      ),
      currentROIValue: new UtilsProvider().getDisplayedDecimals(
        pool.currentROIValue || 0,
      ),
      avgPrice: new UtilsProvider().getDisplayedDecimals(pool.avgPrice || 0),
      realizedROI: new UtilsProvider().getDisplayedDecimals(
        pool.realizedROI || 0,
      ),
      realizedROIValue: new UtilsProvider().getDisplayedDecimals(
        pool.realizedROIValue || 0,
      ),
      remainingBaseTokenBalance: new UtilsProvider().getDisplayedDecimals(
        pool.remainingBaseTokenBalance / 10 ** baseTokenInfo.decimals,
      ),
      batchVolume: new UtilsProvider().getDisplayedDecimals(
        pool.batchVolume / 10 ** baseTokenInfo.decimals,
      ),
      depositedAmount: new UtilsProvider().getDisplayedDecimals(
        pool.depositedAmount / 10 ** baseTokenInfo.decimals,
      ),
      currentSpentBaseToken: new UtilsProvider().getDisplayedDecimals(
        pool.currentSpentBaseToken / 10 ** baseTokenInfo.decimals,
      ),
      totalReceivedFundInBaseTokenAmount:
        new UtilsProvider().getDisplayedDecimals(
          pool.totalReceivedFundInBaseTokenAmount /
            10 ** baseTokenInfo.decimals,
        ),
      currentTargetTokenBalance: new UtilsProvider().getDisplayedDecimals(
        pool.currentTargetTokenBalance / 10 ** targetTokenInfo.decimals,
      ),
      currentReceivedTargetToken: new UtilsProvider().getDisplayedDecimals(
        pool.currentReceivedTargetToken / 10 ** targetTokenInfo.decimals,
      ),
      totalClosedPositionInTargetTokenAmount:
        new UtilsProvider().getDisplayedDecimals(
          pool.totalClosedPositionInTargetTokenAmount /
            10 ** targetTokenInfo.decimals,
        ),
    };
  }

  /**
   * @dev Execute swap token on EVM
   * @param poolId
   * @param chainId
   */
  async executeSwapTokenOnEVM(poolId: string, chainId: ChainID) {
    try {
      const tx = await new EVMBasedMachineProvider(chainId).tryMakingDCASwap(
        poolId,
      );
      console.log('[SWAPPED_SUCCESSFULLY] TxId:', tx.hash);
    } catch (e) {
      throw e;
    } finally {
      await this.syncEVMService.syncPoolById(poolId);
    }
  }

  /**
   * @dev Execute swap token on EVM
   * @param poolId
   * @param chainId
   */
  async executeClosingPositionOnEVM(poolId: string, chainId: ChainID) {
    try {
      const tx = await new EVMBasedMachineProvider(chainId).tryClosingPosition(
        poolId,
      );
      console.log('[CLOSED_POSITION_SUCCESSFULLY] TxId:', tx.hash);
    } catch (e) {
      throw e;
    } finally {
      /**
       * @dev Sync pool after execute machine
       */
      await this.syncEVMService.syncPoolById(poolId);
    }
  }
}
