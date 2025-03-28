import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ArrayType } from '../../api-docs/array-type.decorator';
import { ChainID, PoolStatus } from '../entities/pool.entity';

export enum FindPoolSortOption {
  PROGRESS_ASC = 'PROGRESS_ASC',
  PROGRESS_DESC = 'PROGRESS_DESC',
  DATE_START_DESC = 'DATE_START_DESC',
  DATE_CREATED_DESC = 'DATE_CREATED_DESC',
  TARGET_TOKEN_AMOUNT_DESC = 'TARGET_TOKEN_AMOUNT_DESC',
  TARGET_TOKEN_AMOUNT_ASC = 'TARGET_TOKEN_AMOUNT_ASC',
  CURRENT_SPENT_BASE_TOKEN_AMOUNT_ASC = 'CURRENT_SPENT_BASE_TOKEN_AMOUNT_ASC',
  CURRENT_SPENT_BASE_TOKEN_AMOUNT_DESC = 'CURRENT_SPENT_BASE_TOKEN_AMOUNT_DESC',
}

export class FindPoolDto {
  @IsEnum(ChainID)
  chainId: ChainID;

  @IsString()
  ownerAddress: string;

  @IsEnum(PoolStatus, { each: true })
  @IsOptional()
  @ArrayType()
  statuses?: PoolStatus[];

  @IsEnum(FindPoolSortOption)
  sortBy?: FindPoolSortOption = FindPoolSortOption.DATE_START_DESC;
}
