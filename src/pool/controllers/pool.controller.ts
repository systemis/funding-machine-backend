import {
  Controller,
  Get,
  NotImplementedException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CommonQueryDto } from '@/api-docs/dto/common-query.dto';
import { RegistryProvider } from '@/providers/registry.provider';
import { FindPoolActivityDto } from '../dtos/find-pool-activity.dto';
import { FindPoolDto } from '../dtos/find-pool.dto';
import { PoolActivityEntity } from '../entities/pool-activity.entity';
import { PoolActivityService } from '../services/pool-activity.service';
import { PoolMockService } from '../services/pool-mock.service';
import { PoolService } from '../services/pool.service';
import { CreateEmptyPoolDto } from '../dtos/create-empty-pool.dto';
import { ChainID, PoolStatus } from '../entities/pool.entity';

@Controller('pool')
@ApiTags('pool')
export class PoolController {
  constructor(
    private readonly registry: RegistryProvider,
    private readonly poolService: PoolService,
    private readonly poolMockService: PoolMockService,
    private readonly poolActivityService: PoolActivityService,
  ) {}

  @Get()
  find(
    @Query() { search, limit, offset }: CommonQueryDto,
    @Query() { ownerAddress, statuses, sortBy, chainId }: FindPoolDto,
  ) {
    return this.poolService.find({
      search,
      chainId,
      limit,
      offset,
      ownerAddress,
      statuses,
      sortBy,
    });
  }

  @Get('/decimals-formatted')
  getDisplayedPools(
    @Query() { search, limit, offset }: CommonQueryDto,
    @Query() { ownerAddress, statuses, sortBy, chainId }: FindPoolDto,
  ) {
    return this.poolService.find(
      {
        search,
        chainId,
        limit,
        offset,
        ownerAddress,
        statuses,
        sortBy,
      },
      true,
    );
  }
  @Get('/:id/decimals-formatted')
  async getMachineDetailsWithDecimalsFormatted(@Param('id') id: string) {
    return this.poolService.getPoolDetailWithDecimalsFormatted(id);
  }
  @Post('/:chainId/:ownerAddress')
  createEmpty(@Param() params: CreateEmptyPoolDto) {
    return this.poolService.createEmpty(params.ownerAddress, params.chainId);
  }

  @Get('/:id/')
  async getMachineDetails(@Param('id') id: string) {
    return this.poolService.getPoolDetail(id);
  }

  @Get('/:id/activities')
  async getMachineActivities(@Param('id') id: string) {
    return this.poolActivityService.getPoolActivities(id);
  }

  @Get('/activity')
  async getPoolActivities(
    @Query() { limit, offset, search }: CommonQueryDto,
    @Query()
    { ownerAddress, timeFrom, chainId, timeTo, statuses }: FindPoolActivityDto,
  ): Promise<PoolActivityEntity[]> {
    return this.poolActivityService.find({
      chainId,
      ownerAddress,
      timeFrom,
      timeTo,
      statuses,
      limit,
      offset,
      search,
    });
  }

  @Get('/activity/decimals-formatted')
  async getPoolActivitiesWithDecimalsFormatted(
    @Query() { limit, offset, search }: CommonQueryDto,
    @Query()
    { ownerAddress, timeFrom, chainId, timeTo, statuses }: FindPoolActivityDto,
  ): Promise<PoolActivityEntity[]> {
    return this.poolActivityService.find(
      {
        chainId,
        ownerAddress,
        timeFrom,
        timeTo,
        statuses,
        limit,
        offset,
        search,
      },
      true,
    );
  }

  @Get('/user-activities')
  async getUserActivities(@Query() { ownerAddress }: { ownerAddress: string }) {
    const pools = await this.poolService.find({
      ownerAddress,
      chainId: ChainID.AvaxC,
      limit: 50,
      offset: 0,
      statuses: [
        PoolStatus.ACTIVE,
        PoolStatus.CLOSED,
        PoolStatus.ENDED,
        PoolStatus.PAUSED,
      ],
    });

    let activities = await Promise.all(
      pools.map(
        async (pool) =>
          await this.poolActivityService.getPoolActivities((pool as any)._id),
      ),
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    activities = activities.reduce((accum, activity) => {
      return accum.concat(activity);
    }, []);

    return activities;
  }

  @Post('/mock/generate')
  async generateMock(@Query('ownerAddress') ownerAddress: string) {
    if (this.registry.getConfig().NODE_ENV == 'production') {
      throw new NotImplementedException('API is not supported in production');
    }

    return this.poolMockService.generate(ownerAddress);
  }
}
