import { Module } from '@nestjs/common';

import { OrmModule } from '../orm/orm.module';
import { PortfolioController } from './controllers/portfolio.controller';
import { PortfolioService } from './services/portfolio.service';
import { NotificationModule } from '@/notification/notification.module';
import { SignatureService } from '@/providers/signature.provider';

@Module({
  imports: [OrmModule, NotificationModule],
  controllers: [PortfolioController],
  providers: [SignatureService, PortfolioService],
})
export class PortfolioModule {}
