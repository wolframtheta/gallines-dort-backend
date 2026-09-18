import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionController } from './transaction.controller';
import { PaymentController } from './payment.controller';
import { TransactionService } from './transaction.service';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User])],
  controllers: [TransactionController, PaymentController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
