import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Transaction } from '../transaction/transaction.entity';

export interface SettlementRow {
  person: string;
  personId: string;
  paid: number;
  held: number;
  netContribution: number;
  diff: number;
  fairShare: number;
}

export interface Transfer {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) { }

  async calculate(userId: string) {
    const users = await this.userRepo.find({
      order: { createdAt: 'ASC' },
    });

    // Get aggregated balances per user directly from DB
    const rawBalances = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId IS NOT NULL')
      .groupBy('t.userId')
      .addGroupBy('t.type')
      .getRawMany();

    const balances: Record<string, { paid: number; held: number }> = {};
    users.forEach((u) => {
      balances[u.id] = { paid: 0, held: 0 };
    });

    rawBalances.forEach((row) => {
      if (balances[row.userId]) {
        const amount = parseFloat(row.total);
        if (row.type === 'expense') balances[row.userId].paid += amount;
        else if (row.type === 'income') balances[row.userId].held += amount;
      }
    });

    let totalGroupContribution = 0;
    const settlement: SettlementRow[] = users.map((u) => {
      const b = balances[u.id] || { paid: 0, held: 0 };
      const netContribution = b.paid - b.held;
      totalGroupContribution += netContribution;
      return {
        person: u.displayName || u.email,
        personId: u.id,
        paid: b.paid,
        held: b.held,
        netContribution,
        diff: 0,
        fairShare: 0,
      };
    });

    const fairShare =
      users.length > 0 ? totalGroupContribution / users.length : 0;
    settlement.forEach((s) => {
      s.fairShare = fairShare;
      s.diff = s.netContribution - fairShare;
    });

    const transfers = this.calculateTransfers(settlement);

    const totalExpensesRow = await this.transactionRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'sum')
      .where('t.type = :type', { type: 'expense' })
      .getRawOne();

    const totalIncomeRow = await this.transactionRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'sum')
      .where('t.type = :type', { type: 'income' })
      .getRawOne();

    const totalExpenses = parseFloat(totalExpensesRow?.sum || '0');
    const totalIncome = parseFloat(totalIncomeRow?.sum || '0');

    return {
      totalExpenses,
      totalIncome,
      globalBalance: totalIncome - totalExpenses,
      fairShare,
      settlement,
      transfers,
    };
  }

  private calculateTransfers(settlementData: SettlementRow[]): Transfer[] {
    const debtors = settlementData
      .filter((p) => p.diff < -0.01)
      .map((p) => ({ ...p, diff: p.diff }));
    const creditors = settlementData
      .filter((p) => p.diff > 0.01)
      .map((p) => ({ ...p, diff: p.diff }));

    debtors.sort((a, b) => a.diff - b.diff);
    creditors.sort((a, b) => b.diff - a.diff);

    const transfers: Transfer[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(Math.abs(debtor.diff), creditor.diff);

      if (amount > 0.005) {
        transfers.push({
          from: debtor.person,
          fromId: debtor.personId,
          to: creditor.person,
          toId: creditor.personId,
          amount,
        });
      }

      debtor.diff += amount;
      creditor.diff -= amount;

      if (Math.abs(debtor.diff) < 0.01) i++;
      if (creditor.diff < 0.01) j++;
    }
    return transfers;
  }
}
