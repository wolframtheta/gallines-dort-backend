import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './subscription.entity';
import { Order } from '../order/order.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionCronService } from './subscription-cron.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Order]),
    TransactionModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCronService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
