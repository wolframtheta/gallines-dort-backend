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
import { SubscriptionService } from '../subscription/subscription.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly transactionService: TransactionService,
    private readonly subscriptionService: SubscriptionService,
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
    if (dto.createdAt) {
      order.createdAt = new Date(dto.createdAt);
    }
    return this.orderRepo.save(order);
  }

  async update(id: string, userId: string, dto: UpdateOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id },
    });
    if (!order) throw new NotFoundException('Comanda no trobada');

    if (order.subscriptionId && dto.paid !== undefined) {
      throw new BadRequestException(
        'Les comandes de subscripció es cobren des de Subscripcions (Cobrar mes)'
      );
    }

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

    // Handle unpayment (paid -> not paid): només es treu la transaction. La comanda següent (si n'hi ha) es manté.
    if (!willBePaid && wasPaid) {
      const transaction = await this.transactionService.findByOrderId(id);
      if (transaction) {
        await this.transactionService.remove(transaction.id, userId);
      }
    }

    // Marcar com a no entregat: la comanda següent es manté, no s'elimina.

    Object.assign(order, dto);
    const saved = await this.orderRepo.save(order);

    // Quan una comanda de subscripció es marca com a entregada, assegura que hi ha la següent setmana.
    // Si ja n'hi ha (p.ex. perquè s'havia desmarcat abans), no es crea duplicat.
    const willBeDelivered = dto.delivered ?? order.delivered;
    if (saved.subscriptionId && willBeDelivered) {
      await this.subscriptionService.ensureNextWeekOrder(
        saved.subscriptionId,
        saved.createdAt,
      );
    }

    return saved;
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
