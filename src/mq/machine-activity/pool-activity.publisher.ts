import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Duration } from 'luxon';
import { Queue } from 'bull';

import { PoolDocument, PoolModel } from '@/orm/model/pool.model';
import {
  POOL_ACTIVITY_QUEUE,
  SYNC_EVM_POOL_ACTIVITIES,
} from '../dto/pool-activity.queue';

@Injectable()
export class PoolActivityPublisher implements OnApplicationBootstrap {
  constructor(
    @InjectModel(PoolModel.name)
    private readonly poolRepo: Model<PoolDocument>,
    @InjectQueue(POOL_ACTIVITY_QUEUE)
    private readonly poolActivityQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    this.createSyncEVMActivitiesJob().catch((e) =>
      console.log('ERROR::FAILED_TO_SYNC_POOL_ACTIVITY', e),
    );
  }

  async createSyncEVMActivitiesJob() {
    /**
     * @dev Flush the queue
     */
    await this.poolActivityQueue.removeRepeatableByKey(
      SYNC_EVM_POOL_ACTIVITIES,
    );

    /**
     * @dev Add a task to the queue
     */
    await this.poolActivityQueue.add(
      SYNC_EVM_POOL_ACTIVITIES,
      {},
      {
        /** Use pool ID as jobId to upsert queue event */
        jobId: SYNC_EVM_POOL_ACTIVITIES,
        priority: 1,

        /**
         * @dev Sync data every 5 minutes
         */
        repeat: {
          startDate: new Date(),
          every: Duration.fromObject({
            minutes: 1,
          }).toMillis(),
        },
      },
    );

    /** Publish repeatable job */
    console.log(
      `[${SYNC_EVM_POOL_ACTIVITIES}] Added sync machine activities job ...`,
    );
  }
}
