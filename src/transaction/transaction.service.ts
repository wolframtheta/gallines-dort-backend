import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) { }

  async findAll(userId: string) {
    return this.transactionRepo.find({
      relations: ['user', 'order'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
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
    });
    return this.transactionRepo.save(tx);
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
    await this.transactionRepo.remove(tx);
  }
}
