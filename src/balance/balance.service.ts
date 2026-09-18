import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
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

    // 1a. Despeses reals del grup (sense payment ni split) → fairShare
    const fairShareBalances = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId IS NOT NULL')
      .andWhere('t.paymentGroupId IS NULL')
      .andWhere('t.splitGroupId IS NULL')
      .groupBy('t.userId')
      .addGroupBy('t.type')
      .getRawMany();

    // 1b. Despeses visibles (inclou avançaments de splits) per «Ha pagat»
    const paidBalances = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.userId', 'userId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId IS NOT NULL')
      .andWhere('t.type = :type', { type: 'expense' })
      .andWhere('t.paymentGroupId IS NULL')
      .groupBy('t.userId')
      .getRawMany();

    // 2. Payment pairs (amb paymentGroupId) → deutes o liquidacions
    const paymentTxs = await this.transactionRepo.find({
      where: { paymentGroupId: Not(IsNull()) },
    });

    const paymentPairs = new Map<
      string,
      { from: string; to: string; amount: number; isSettlement: boolean }
    >();
    for (const tx of paymentTxs) {
      if (!tx.paymentGroupId) continue;
      const existing = paymentPairs.get(tx.paymentGroupId);
      if (!existing) {
        paymentPairs.set(tx.paymentGroupId, {
          from: tx.type === 'expense' ? tx.userId : '',
          to: tx.type === 'income' ? tx.userId : '',
          amount: tx.amount,
          isSettlement: tx.isSettlement,
        });
      } else {
        if (tx.type === 'expense') existing.from = tx.userId;
        if (tx.type === 'income') existing.to = tx.userId;
      }
    }

    const fairShareByUser: Record<string, { paid: number; held: number }> = {};
    const displayPaid: Record<string, number> = {};
    users.forEach((u) => {
      fairShareByUser[u.id] = { paid: 0, held: 0 };
      displayPaid[u.id] = 0;
    });

    fairShareBalances.forEach((row) => {
      if (fairShareByUser[row.userId]) {
        const amount = parseFloat(row.total);
        if (row.type === 'expense') fairShareByUser[row.userId].paid += amount;
        else if (row.type === 'income') fairShareByUser[row.userId].held += amount;
      }
    });

    paidBalances.forEach((row) => {
      if (displayPaid[row.userId] !== undefined) {
        displayPaid[row.userId] = parseFloat(row.total);
      }
    });

    // FairShare sobre despeses reals del grup (sense splits ni payments)
    let totalGroupContribution = 0;
    const settlement: SettlementRow[] = users.map((u) => {
      const b = fairShareByUser[u.id] || { paid: 0, held: 0 };
      const netContribution = b.paid - b.held;
      totalGroupContribution += netContribution;
      return {
        person: u.displayName || u.email,
        personId: u.id,
        paid: displayPaid[u.id] ?? 0,
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

    // Ajustar diff amb payments (splits i liquidacions)
    for (const [, pair] of paymentPairs) {
      if (!pair.from || !pair.to || pair.amount < 0.01) continue;

      const fromRow = settlement.find((s) => s.personId === pair.from);
      const toRow = settlement.find((s) => s.personId === pair.to);
      if (!fromRow || !toRow) continue;

      if (pair.isSettlement) {
        // Liquidació: from ha pagat a to → redueix deute
        fromRow.diff += pair.amount;
        toRow.diff -= pair.amount;
      } else {
        // Split: from deu a to (qui ha avançat)
        fromRow.diff -= pair.amount;
        toRow.diff += pair.amount;
      }
    }

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
