import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { TransactionService } from '../transaction/transaction.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly transactionService: TransactionService,
    private readonly config: ConfigService,
  ) { }

  async findAll(userId: string) {
    return this.orderRepo.find({
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateOrderDto) {
    const order = this.orderRepo.create({
      clientName: dto.clientName.trim(),
      mitgesDotzenes: dto.mitgesDotzenes,
    });
    return this.orderRepo.save(order);
  }

  async update(id: string, userId: string, dto: UpdateOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id },
    });
    if (!order) throw new NotFoundException('Comanda no trobada');

    const wasPaid = order.paid;
    const willBePaid = dto.paid ?? order.paid;

    // Ensure income is recorded when marking as paid
    if (willBePaid && !wasPaid) {
      const pricePerUnit =
        parseFloat(this.config.get('PRICE_PER_MITJA_DOTZENA', '2.5')) || 2.5;
      const amount = order.mitgesDotzenes * pricePerUnit;

      await this.transactionService.create(userId, {
        userId, // The user who marks it as paid (holds the money)
        clientName: order.clientName,
        type: 'income',
        amount,
        description: `Comanda ous: ${order.clientName} - ${order.mitgesDotzenes} mitges dotzenes`,
        date: new Date().toISOString().split('T')[0],
        orderId: order.id,
      });
    }

    // Handle unpayment (paid -> not paid)
    if (!willBePaid && wasPaid) {
      const transaction = await this.transactionService.findByOrderId(id);
      if (transaction) {
        await this.transactionService.remove(transaction.id, userId);
      }
    }

    Object.assign(order, dto);
    return this.orderRepo.save(order);
  }

  async remove(id: string, userId: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
    });
    if (!order) throw new NotFoundException('Comanda no trobada');
    // Remove associated transaction if it exists
    const transaction = await this.transactionService.findByOrderId(id);
    if (transaction) {
      await this.transactionService.remove(transaction.id, userId);
    }

    await this.orderRepo.remove(order);
  }
}
