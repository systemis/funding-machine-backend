import { Module } from '@nestjs/common';

import { OrmModule } from '../orm/orm.module';
import { PortfolioController } from './controllers/portfolio.controller';
import { PortfolioService } from './services/portfolio.service';
import { NotificationModule } from '@/notification/notification.module';

@Module({
  imports: [OrmModule, NotificationModule],
  providers: [PortfolioService],
  controllers: [PortfolioController],
})
export class PortfolioModule {}
