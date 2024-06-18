import * as mongoose from 'mongoose';
import { Model } from 'mongoose';
import { BigNumber } from 'ethers';

import { EVMBasedMachineProvider } from './evm.provider';
import {
  BuyCondition,
  ChainID,
  PoolEntity,
  PoolStatus,
  PriceConditionType,
  StopConditions,
  TradingStopCondition,
  TradingStopType,
} from '@/pool/entities/pool.entity';
import { Types } from './libs/contracts/MachineRegistry';
import {
  ActivityType,
  PoolActivityEntity,
  PoolActivityStatus,
} from '@/pool/entities/pool-activity.entity';
import { PoolDocument } from '@/orm/model/pool.model';
import { WhitelistDocument } from '@/orm/model/whitelist.model';

export class EVMIndexer {
  public readonly provider: EVMBasedMachineProvider;

  constructor(
    public readonly chainId: ChainID,
    private readonly poolRepo: Model<PoolDocument>,
    private readonly whitelist: Model<WhitelistDocument>,
  ) {
    this.provider = new EVMBasedMachineProvider(this.chainId);
  }

  /**
   * @dev Mapping buy condition
   * @param condition
   * @private
   */
  private mapBuyCondition(
    condition: Types.ValueComparisonStructOutput,
  ): BuyCondition | undefined {
    if (BigInt(condition.operator).toString() === '0') {
      // unset
      return;
    }

    let type;

    switch (condition.operator) {
      case 1:
        type = PriceConditionType.GT;
        break;
      case 2:
        type = PriceConditionType.GTE;
        break;
      case 3:
        type = PriceConditionType.LT;
        break;
      case 4:
        type = PriceConditionType.LTE;
        break;
      case 5:
        type = PriceConditionType.BW;
        break;
      case 6:
        type = PriceConditionType.NBW;
        break;
      default:
        return;
    }

    return {
      value: [
        parseFloat(condition.value0.toString()),
        parseFloat(condition.value1.toString()),
      ],
      type,
    };
  }

  /**
   * @dev Mapping status
   * @private
   * @param machineData
   */
  private mapStatus(machineData: Types.MachineStructOutput): PoolStatus {
    switch (machineData.status) {
      case 1:
        return PoolStatus.ACTIVE;
      case 2:
        return PoolStatus.PAUSED;
      case 3:
        return PoolStatus.CLOSED;
      case 4:
        return PoolStatus.ENDED;
      default:
        return PoolStatus.ACTIVE;
    }
  }

  /**
   * @dev Mapping stop condition
   * @param stopConditions
   * @private
   */
  private mapStopCondition(
    stopConditions: Types.StopConditionStructOutput[],
  ): StopConditions {
    const stopCondition: StopConditions = {};

    stopConditions.map((cond) => {
      switch (cond.operator) {
        case 0:
          stopCondition.endTime = new Date(cond.value.toNumber() * 1000);
          break;
        case 1:
          stopCondition.batchAmountReach = cond.value.toNumber();
          break;
        case 2:
          stopCondition.spentBaseTokenReach = parseFloat(cond.value.toString());
          break;
        case 3:
          stopCondition.receivedTargetTokenReach = parseFloat(
            cond.value.toString(),
          );
          break;
      }
    });

    return stopCondition;
  }

  /**
   * @dev Map trading stop condition
   * @param tradingStopCondition
   * @private
   */
  private mapTradingStopCondition(
    tradingStopCondition: Types.TradingStopConditionStructOutput,
  ): TradingStopCondition | undefined {
    switch (tradingStopCondition.stopType) {
      case 0:
        return;
      case 1:
        return {
          stopType: TradingStopType.Price,
          value: parseFloat(tradingStopCondition.value.toString()),
        };
      case 2:
        return {
          stopType: TradingStopType.PortfolioPercentageDiff,
          value: parseFloat(tradingStopCondition.value.toString()),
        };
      case 3:
        return {
          stopType: TradingStopType.PortfolioValueDiff,
          value: parseFloat(tradingStopCondition.value.toString()),
        };
    }
  }

  /**
   * @dev Aggregate data
   * @param payload
   * @private
   */
  private aggregateData(payload: {
    stopConditions: Types.StopConditionStructOutput[];
    machineData: Types.MachineStructOutput;
  }): Partial<PoolEntity> | null {
    const { machineData, stopConditions: stopConditionData } = payload;

    if (machineData.id === '') return null;

    const data = {
      id: machineData.id,
      chainId: this.chainId,
      address: machineData.id,
      baseTokenAddress: machineData.baseTokenAddress,
      targetTokenAddress: machineData.targetTokenAddress,
      batchVolume: parseFloat(machineData.batchVolume.toString()),
      buyCondition: this.mapBuyCondition(machineData.openingPositionCondition),
      currentBatchAmount: parseFloat(
        machineData.executedBatchAmount.toString(),
      ),
      currentReceivedTargetToken: parseFloat(
        machineData.totalReceivedTargetAmount.toString(),
      ),
      currentSpentBaseToken: parseFloat(
        machineData.totalSwappedBaseAmount.toString(),
      ),
      currentTargetTokenBalance: parseFloat(
        machineData.targetTokenBalance.toString(),
      ),
      depositedAmount: parseFloat(
        machineData.totalDepositedBaseAmount.toString(),
      ),
      remainingBaseTokenBalance: parseFloat(
        machineData.baseTokenBalance.toString(),
      ),
      frequency: {
        seconds: parseFloat(machineData.frequency.toString()),
      },
      nextExecutionAt: new Date(
        machineData.nextScheduledExecutionAt.toNumber() * 1000,
      ),
      ownerAddress: machineData.owner,
      startTime: new Date(machineData.startAt.toNumber() * 1000),
      status: this.mapStatus(machineData),
      stopConditions: this.mapStopCondition(stopConditionData),
      stopLossCondition: this.mapTradingStopCondition(
        machineData.stopLossCondition,
      ),
      takeProfitCondition: this.mapTradingStopCondition(
        machineData.takeProfitCondition,
      ),
      totalClosedPositionInTargetTokenAmount: parseFloat(
        machineData.totalClosedPositionInTargetTokenAmount.toString(),
      ),
      totalReceivedFundInBaseTokenAmount: parseFloat(
        machineData.totalReceivedFundInBaseTokenAmount.toString(),
      ),
      ammRouterAddress: machineData.ammRouterAddress,
      ammRouterVersion: ['V3', 'V2'].at(machineData.ammRouterVersion),
    };

    /**
     * @dev Compute status
     */
    if (
      data.status === PoolStatus.ACTIVE &&
      data.stopConditions.endTime &&
      new Date(data.stopConditions.endTime).getTime() <= new Date().getTime()
    ) {
      data.status = PoolStatus.CLOSED;
    }

    return data;
  }

  /**
   * @dev Fetch single machine entity
   * @param machineId
   */
  public async fetchMachineEntity(
    machineId: string,
  ): Promise<Partial<PoolEntity | null>> {
    const { stopConditions, machineData } = await this.provider.fetchMachine(
      machineId,
    );
    return this.aggregateData({ stopConditions, machineData });
  }

  /**
   * @dev Fetch multiple machine entities
   * @param machineIdList
   */
  public async fetchMultipleMachines(
    machineIdList: string[],
  ): Promise<Partial<PoolEntity | null>[]> {
    const onChainData = await this.provider.fetchMultipleMachines(
      machineIdList,
    );
    return onChainData.map((data) => this.aggregateData(data));
  }

  private async calculateROIAndAvgPrice(
    machineId: string,
    positionValue: BigNumber,
  ) {
    const machine = await this.poolRepo.findById(machineId);
    const baseToken = await this.whitelist.findOne({
      address: machine.baseTokenAddress,
    });
    const targetToken = await this.whitelist.findOne({
      address: machine.targetTokenAddress,
    });

    if (!baseToken || !targetToken) {
      return {
        roiValue: null,
        realizedROI: null,
        realizedROIValue: null,
        roi: null,
        avgPrice: null,
      };
    }

    const avgPrice =
      machine.currentSpentBaseToken /
      10 ** baseToken.decimals /
      (machine.currentReceivedTargetToken / 10 ** targetToken.decimals);

    const roi =
      ((parseFloat(positionValue.toString()) -
        parseFloat(machine.currentSpentBaseToken.toString())) *
        100) /
      parseFloat(machine.currentSpentBaseToken.toString());

    const roiValue =
      (parseFloat(positionValue.toString()) -
        parseFloat(machine.currentSpentBaseToken.toString())) /
      10 ** baseToken.decimals;

    const realizedROI =
      ((parseFloat(machine.totalReceivedFundInBaseTokenAmount.toString()) -
        parseFloat(machine.currentSpentBaseToken.toString())) *
        100) /
      parseFloat(machine.currentSpentBaseToken.toString());

    const realizedROIValue =
      (parseFloat(machine.totalReceivedFundInBaseTokenAmount.toString()) -
        parseFloat(machine.currentSpentBaseToken.toString())) /
      10 ** baseToken.decimals;

    const result = {
      roiValue: isNaN(roiValue) ? null : roiValue,
      realizedROI: isNaN(realizedROI) ? null : realizedROI,
      realizedROIValue: isNaN(realizedROIValue) ? null : realizedROIValue,
      roi: isNaN(roi) ? null : roi,
      avgPrice: isNaN(avgPrice) ? null : avgPrice,
    };

    if (machine.status === PoolStatus.ENDED) {
      result.roi = 0;
      result.roiValue = 0;
    }

    console.log({
      ...result,
      positionValue: positionValue.toString(),
      currentSpentBaseToken: machine.currentSpentBaseToken,
    });

    return result;
  }

  /**
   * @dev Calculate ROI and avg price with given machine model.
   * We will calculate and compare the balance based on the scenario that if we close position at market price, how much we get back in fund.
   * @param machineId
   */
  public async calculateSingleROIAndAvgPrice(machineId: string): Promise<{
    roi: number;
    avgPrice: number;
    roiValue: number;
    realizedROI: number;
    realizedROIValue: number;
  }> {
    const machine = await this.poolRepo.findById(machineId);
    const amount = BigNumber.from(
      `0x${(machine.currentReceivedTargetToken || 0).toString(16)}`,
    );
    const bestFee = await this.provider.getBestFee(
      machine.targetTokenAddress,
      machine.baseTokenAddress,
      machine.ammRouterAddress,
      amount,
    );

    const { amountOut } = await this.provider
      .getQuote(
        machine.targetTokenAddress,
        machine.baseTokenAddress,
        machine.ammRouterAddress,
        amount,
        BigNumber.from(bestFee),
      )
      .catch(() => {
        return {
          amountOut: BigNumber.from(
            `0x${(machine.currentSpentBaseToken || 0).toString(16)}`,
          ),
        };
      });

    return this.calculateROIAndAvgPrice(machine.id, amountOut);
  }

  /**
   * @dev Calculate multiple roi and avg price
   * @param payload
   */
  public async calculateMultipleROIAndAvg(
    payload: {
      machineId: string;
      baseTokenAddress: string;
      targetTokenAddress: string;
      amount: BigNumber;
      ammRouterAddress: string;
    }[],
  ): Promise<
    {
      roi: number;
      avgPrice: number;
      roiValue: number;
      realizedROI: number;
      realizedROIValue: number;
    }[]
  > {
    const aggregatedData = await this.provider.getMultipleQuotes(
      await Promise.all(
        payload.map(async (elm) => {
          return {
            baseTokenAddress: elm.targetTokenAddress,
            targetTokenAddress: elm.baseTokenAddress,
            amount: elm.amount,
            ammRouterAddress: elm.ammRouterAddress,
            fee: await this.provider.getBestFee(
              elm.baseTokenAddress,
              elm.targetTokenAddress,
              elm.ammRouterAddress,
              elm.amount,
            ),
          };
        }),
      ),
    );

    return Promise.all(
      aggregatedData.map((data, index) =>
        this.calculateROIAndAvgPrice(payload[index].machineId, data.amountOut),
      ),
    );
  }

  private async aggregateEventData(
    event: any,
  ): Promise<Partial<PoolActivityEntity> | null> {
    try {
      const memoMapping = {
        USER_UPDATE_MACHINE: ActivityType.UPDATED,
        OPERATOR_UPDATED_TRADING_STATS: ActivityType.UPDATED,
        USER_DEPOSITED_FUND: ActivityType.UPDATED,
        USER_WITHDREW_FUND: ActivityType.UPDATED,
        USER_PAUSED_MACHINE: ActivityType.PAUSED,
        USER_RESTARTED_MACHINE: ActivityType.RESTARTED,
        USER_CLOSED_POSITION: ActivityType.UPDATED,
        CLOSED_MACHINE_DUE_TO_POSITION_CLOSED: ActivityType.CLOSED,
        OPERATOR_CLOSED_MACHINE_DUE_TO_STOP_CONDITIONS: ActivityType.CLOSED,
        USER_CLOSED_MACHINE: ActivityType.CLOSED,
        OPERATOR_TAKE_PROFIT: ActivityType.TAKE_PROFIT,
        OPERATOR_STOP_LOSS: ActivityType.STOP_LOSS,
      };

      const handler = {
        MachineUpdated: (event) => {
          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: memoMapping[event.args[3]],
            memo: event.args[3],
            createdAt: new Date(event.args[5].toNumber() * 1000),
          };
        },
        MachineInitialized: (event) => {
          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: ActivityType.CREATED,
            memo: '',
            createdAt: new Date(event.args[4].toNumber() * 1000),
          };
        },
        Deposited: async (event) => {
          const token = await this.whitelist.findOne({
            address: event.args[2],
          });

          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: ActivityType.DEPOSITED,
            baseTokenAmount:
              parseFloat(event.args[3].toString()) / 10 ** token.decimals,
            memo: '',
            createdAt: new Date(event.args[4].toNumber() * 1000),
          };
        },
        Withdrawn: async (event) => {
          const baseToken = await this.whitelist.findOne({
            address: event.args[2],
          });
          const targetToken = await this.whitelist.findOne({
            address: event.args[4],
          });

          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: ActivityType.WITHDRAWN,
            baseTokenAmount:
              parseFloat(event.args[3].toString()) / 10 ** baseToken.decimals,
            targetTokenAmount:
              parseFloat(event.args[5].toString()) / 10 ** targetToken.decimals,
            memo: '',
            createdAt: new Date(event.args[6].toNumber() * 1000),
          };
        },
        Swapped: async (event) => {
          const baseToken = await this.whitelist.findOne({
            address: event.args[2],
          });
          const targetToken = await this.whitelist.findOne({
            address: event.args[4],
          });

          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: ActivityType.SWAPPED,
            baseTokenAmount:
              parseFloat(event.args[3].toString()) / 10 ** baseToken.decimals,
            targetTokenAmount:
              parseFloat(event.args[5].toString()) / 10 ** targetToken.decimals,
            memo: '',
            createdAt: new Date(event.args[6].toNumber() * 1000),
          };
        },
        ClosedPosition: async (event) => {
          const baseToken = await this.whitelist.findOne({
            address: event.args[2],
          });
          const targetToken = await this.whitelist.findOne({
            address: event.args[4],
          });

          return {
            actor: event.args[0],
            poolId: new mongoose.Types.ObjectId(event.args[1]),
            type: ActivityType.CLOSED_POSITION,
            baseTokenAmount:
              parseFloat(event.args[3].toString()) / 10 ** baseToken.decimals,
            targetTokenAmount:
              parseFloat(event.args[5].toString()) / 10 ** targetToken.decimals,
            memo: '',
            createdAt: new Date(event.args[6].toNumber() * 1000),
          };
        },
      };

      return await handler[event.name](event);
    } catch {
      return null;
    }
  }

  /**
   * @dev Fetch event entities
   * @param blockNumber
   * @param blockDiff
   */
  public async fetchEventEntities(
    blockNumber: number,
    blockDiff: number,
  ): Promise<{ data: PoolActivityEntity[]; syncedBlock: number }> {
    const { data, syncedBlock } = await this.provider.fetchEvents(
      blockNumber,
      blockDiff,
    );

    console.log('events length', data.length);

    return {
      data: (
        await Promise.all(
          data.map(async (event) => {
            return {
              chainId: this.chainId,
              status: PoolActivityStatus.SUCCESSFUL,
              transactionId: event.transactionHash,
              baseTokenAmount: null,
              targetTokenAmount: null,
              eventHash: event.eventHash,

              /**
               * @dev To be feeded
               */
              ...(await this.aggregateEventData(event)),
            } as PoolActivityEntity;
          }),
        )
      ).filter((elm) => !!elm.type),
      syncedBlock,
    };
  }
}
