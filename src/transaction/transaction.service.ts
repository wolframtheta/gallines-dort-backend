import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, In } from 'typeorm';
import { randomUUID } from 'crypto';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from '../user/user.entity';

export interface PaymentRecord {
  paymentGroupId: string;
  fromUserId: string;
  toUserId: string;
  fromName: string;
  toName: string;
  amount: number;
  description: string;
  date: string;
  createdAt: Date;
  isSettlement: boolean;
  splitGroupId?: string;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(userId: string) {
    return this.transactionRepo.find({
      relations: ['user', 'order'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAllPayments(): Promise<PaymentRecord[]> {
    const txs = await this.transactionRepo.find({
      where: { paymentGroupId: Not(IsNull()) },
      relations: ['user'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const groups = new Map<string, Transaction[]>();
    for (const tx of txs) {
      const list = groups.get(tx.paymentGroupId) ?? [];
      list.push(tx);
      groups.set(tx.paymentGroupId, list);
    }

    const payments: PaymentRecord[] = [];
    for (const [paymentGroupId, groupTxs] of groups) {
      const expense = groupTxs.find((t) => t.type === 'expense');
      const income = groupTxs.find((t) => t.type === 'income');
      if (!expense || !income) continue;

      payments.push({
        paymentGroupId,
        fromUserId: expense.userId,
        toUserId: income.userId,
        fromName: expense.user?.displayName || expense.user?.email || '?',
        toName: income.user?.displayName || income.user?.email || '?',
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        createdAt: expense.createdAt,
        isSettlement: expense.isSettlement,
        splitGroupId: expense.splitGroupId ?? undefined,
      });
    }

    payments.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return payments;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.type === 'expense' && !dto.userId) {
      throw new BadRequestException('Expenses must be assigned to a user');
    }

    const tx = this.transactionRepo.create({
      userId: dto.userId,
      clientName: dto.clientName,
      type: dto.type,
      amount: dto.amount,
      description:
        dto.description ||
        (dto.type === 'expense' ? 'Despesa' : 'Venda ous'),
      date: dto.date || new Date().toISOString().split('T')[0],
      orderId: dto.orderId,
      splitGroupId: dto.splitGroupId,
    });
    return this.transactionRepo.save(tx);
  }

  async createPayment(dto: CreatePaymentDto): Promise<PaymentRecord> {
    if (dto.fromUserId === dto.toUserId) {
      throw new BadRequestException('El pagador i el receptor han de ser diferents');
    }

    const users = await this.userRepo.findBy({ id: In([dto.fromUserId, dto.toUserId]) });
    if (users.length !== 2) {
      throw new BadRequestException('Usuari no trobat');
    }

    const fromUser = users.find((u) => u.id === dto.fromUserId)!;
    const toUser = users.find((u) => u.id === dto.toUserId)!;
    const fromName = fromUser.displayName || fromUser.email;
    const toName = toUser.displayName || toUser.email;
    const date = dto.date || new Date().toISOString().split('T')[0];
    const paymentGroupId = randomUUID();
    const isSettlement = dto.isSettlement ?? true;
    const description =
      dto.description?.trim() ||
      `Pagament de ${fromName} a ${toName}`;

    await this.transactionRepo.save([
      this.transactionRepo.create({
        userId: dto.fromUserId,
        type: 'expense',
        amount: dto.amount,
        description,
        date,
        paymentGroupId,
        isSettlement,
        splitGroupId: dto.splitGroupId,
      }),
      this.transactionRepo.create({
        userId: dto.toUserId,
        type: 'income',
        amount: dto.amount,
        description,
        date,
        paymentGroupId,
        isSettlement,
        splitGroupId: dto.splitGroupId,
      }),
    ]);

    const saved = await this.transactionRepo.findOne({
      where: { paymentGroupId, type: 'expense' },
    });

    return {
      paymentGroupId,
      fromUserId: dto.fromUserId,
      toUserId: dto.toUserId,
      fromName,
      toName,
      amount: dto.amount,
      description,
      date,
      createdAt: saved!.createdAt,
      isSettlement,
      splitGroupId: dto.splitGroupId,
    };
  }

  async findByOrderId(orderId: string) {
    return this.transactionRepo.findOne({
      where: { orderId },
      relations: ['user'],
    });
  }

  async remove(id: string, userId: string) {
    const tx = await this.transactionRepo.findOne({
      where: { id },
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.splitGroupId) {
      await this.transactionRepo.delete({ splitGroupId: tx.splitGroupId });
      return;
    }

    if (tx.paymentGroupId) {
      await this.transactionRepo.delete({ paymentGroupId: tx.paymentGroupId });
      return;
    }

    await this.transactionRepo.remove(tx);
  }

  async removePayment(paymentGroupId: string) {
    const result = await this.transactionRepo.delete({ paymentGroupId });
    if (!result.affected) {
      throw new NotFoundException('Pagament no trobat');
    }
  }
}
