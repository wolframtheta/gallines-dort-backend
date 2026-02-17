import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { TransactionModule } from '../transaction/transaction.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    TransactionModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule { }
