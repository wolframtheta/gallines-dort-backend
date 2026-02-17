import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Transaction } from '../transaction/transaction.entity';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Transaction]),
  ],
  controllers: [BalanceController],
  providers: [BalanceService],
})
export class BalanceModule { }
