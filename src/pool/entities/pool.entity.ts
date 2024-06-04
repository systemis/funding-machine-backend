import { Type } from 'class-transformer';
import { DurationObjectUnits } from 'luxon';

export enum PoolStatus {
  CREATED = 'POOL_STATUS::CREATED',
  ACTIVE = 'POOL_STATUS::ACTIVE',
  PAUSED = 'POOL_STATUS::PAUSED',
  CLOSED = 'POOL_STATUS::CLOSED',
  ENDED = 'POOL_STATUS::ENDED',
}

export enum PriceConditionType {
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  /** Equal */
  EQ = 'EQ',
  /** Not Equal */
  NEQ = 'NEQ',
  /** Between */
  BW = 'BW',
  /** Not Between */
  NBW = 'NBW',
}

export const PriceConditionDisplay = {
  [PriceConditionType.GT]: '>',
  [PriceConditionType.GTE]: '>=',
  [PriceConditionType.LT]: '<',
  [PriceConditionType.LTE]: '<=',
  [PriceConditionType.EQ]: '=',
  [PriceConditionType.NEQ]: '<>',
  [PriceConditionType.BW]: '<>',
};

export enum MainProgressBy {
  END_TIME = 'MAIN_PROGRESS_BY::END_TIME',
  SPENT_BASE_TOKEN = 'MAIN_PROGRESS_BY::SPENT_BASE_TOKEN',
  RECEIVED_TARGET_TOKEN = 'MAIN_PROGRESS_BY::RECEIVED_TARGET_TOKEN',
  BATCH_AMOUNT = 'MAIN_PROGRESS_BY::BATCH_AMOUNT',
}
export enum ChainID {
  Solana = 'solana',
  BSC = 'bnb',
  Mumbai = 'polygon_mumbai',
  OKT = 'okt',
  Gnosis = 'gnosis',
  XDC = 'xdc',
  AvaxC = 'avaxc',
  AptosTestnet = 'aptos_testnet',
  AptosMainnet = 'aptos',
  Klaytn = 'klaytn',
  Mantle = 'mantle',
  ScrollSepolia = 'scroll_sepolia',
}

export const StoppedChains = [
  ChainID.OKT,
  ChainID.Gnosis,
  ChainID.XDC,
  ChainID.Mumbai,
  ChainID.AptosTestnet,
];

export class BuyCondition {
  type: PriceConditionType;
  value: number[];
}
export class StopConditions {
  endTime?: Date;
  spentBaseTokenReach?: number;
  receivedTargetTokenReach?: number;
  batchAmountReach?: number;
}
export enum TradingStopType {
  Unset = 'TRADING_STOP::UNSET',
  Price = 'TRADING_STOP::PRICE',
  PortfolioPercentageDiff = 'TRADING_STOP::PORTFOLIO_PERCENTAGE_DIFF',
  PortfolioValueDiff = 'TRADING_STOP::PORTFOLIO_VALUE_DIFF',
}
export class TradingStopCondition {
  stopType: TradingStopType;
  value: number;
}
export class PoolEntity {
  id: string;
  chainId: ChainID;
  address: string;
  ownerAddress: string;
  name: string;
  status: PoolStatus;
  baseTokenAddress: string;
  targetTokenAddress: string;
  ammRouterAddress: string;
  marketKey: string;
  startTime: Date;
  nextExecutionAt: Date;
  batchVolume: number;
  frequency: DurationObjectUnits;
  @Type(() => BuyCondition)
  buyCondition: BuyCondition | undefined;
  @Type(() => StopConditions)
  stopConditions: StopConditions | undefined;
  @Type(() => TradingStopCondition)
  stopLossCondition: TradingStopCondition | undefined;
  @Type(() => TradingStopCondition)
  takeProfitCondition: TradingStopCondition | undefined;
  /** Progression fields */
  remainingBaseTokenBalance: number;
  currentTargetTokenBalance: number;
  currentBatchAmount: number;
  mainProgressBy: MainProgressBy | undefined;
  progressPercent: number;
  endedAt: Date;
  closedAt: Date;
  /**
   * @dev Archived information used for statistic
   */
  depositedAmount: number;
  currentSpentBaseToken: number;
  currentReceivedTargetToken: number;
  totalClosedPositionInTargetTokenAmount: number;
  totalReceivedFundInBaseTokenAmount: number;
  currentROI: number;
  currentROIValue: number;
  avgPrice: number;
  realizedROI: number;
  realizedROIValue: number;
}

/**
 * External method because ORM model isn't need to implement.
 * Note: Require bind before call.
 */
export function calculateProgressPercent(machine: PoolEntity) {
  if (!machine.stopConditions) {
    machine.progressPercent = -1;
    return;
  }

  switch (machine.mainProgressBy) {
    case MainProgressBy.SPENT_BASE_TOKEN:
      machine.progressPercent =
        machine.currentSpentBaseToken /
        machine.stopConditions.spentBaseTokenReach;
      break;

    case MainProgressBy.RECEIVED_TARGET_TOKEN:
      machine.progressPercent =
        machine.currentReceivedTargetToken /
        machine.stopConditions.receivedTargetTokenReach;
      break;

    case MainProgressBy.BATCH_AMOUNT:
      machine.progressPercent =
        machine.currentBatchAmount / machine.stopConditions.batchAmountReach;
      break;

    case MainProgressBy.END_TIME:
      const startTimeInMillis = machine.startTime.getTime();
      const endTimeInMillis = machine.stopConditions.endTime.getTime();
      const currentInMillis = new Date().getTime();
      machine.progressPercent =
        (Math.max(currentInMillis, startTimeInMillis) - startTimeInMillis) /
        (endTimeInMillis - startTimeInMillis);
  }
}
