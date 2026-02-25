import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Subscription } from './subscription.entity';
import { Order } from '../order/order.entity';
import { TransactionService } from '../transaction/transaction.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

dayjs.extend(isoWeek);

function getWeekStart(d: Date): Date {
  return dayjs(d).startOf('isoWeek').toDate();
}

function getWeekEnd(d: Date): Date {
  return dayjs(d).endOf('isoWeek').toDate();
}

function getMonthStart(d: Date): Date {
  return dayjs(d).startOf('month').toDate();
}

function getMonthEnd(d: Date): Date {
  return dayjs(d).endOf('month').toDate();
}

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly transactionService: TransactionService,
    private readonly config: ConfigService,
  ) {}

  async findAll() {
    return this.subRepo.find({
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const sub = await this.subRepo.findOne({
      where: { id },
      relations: ['orders'],
    });
    if (!sub) throw new NotFoundException('Subscripció no trobada');
    return sub;
  }

  async create(dto: CreateSubscriptionDto) {
    const sub = this.subRepo.create({
      clientName: dto.clientName.trim(),
      mitgesDotzenes: dto.mitgesDotzenes,
      amountPerMonth: dto.amountPerMonth ?? null,
    });
    const saved = await this.subRepo.save(sub);

    // Genera la primera comanda d'aquesta setmana
    const order = this.orderRepo.create({
      clientName: saved.clientName,
      mitgesDotzenes: saved.mitgesDotzenes,
      subscriptionId: saved.id,
    });
    await this.orderRepo.save(order);

    return saved;
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscripció no trobada');
    Object.assign(sub, dto);
    return this.subRepo.save(sub);
  }

  async remove(id: string) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscripció no trobada');
    await this.subRepo.remove(sub);
  }

  /** Genera comandes d'aquesta setmana per a totes les subscripcions actives */
  async generateWeeklyOrders() {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(now);

    const subscriptions = await this.subRepo.find({
      where: { active: true },
    });

    const created: Order[] = [];

    for (const sub of subscriptions) {
      const existing = await this.orderRepo.findOne({
        where: {
          subscriptionId: sub.id,
          createdAt: Between(weekStart, weekEnd),
        },
      });
      if (existing) continue;

      // Comprovar si hi ha comandes de setmanes passades sense entregar (subscripció en retard)
      const hasStaleUndelivered = await this.orderRepo
        .createQueryBuilder('o')
        .where('o.subscriptionId = :subId', { subId: sub.id })
        .andWhere('o.delivered = false')
        .andWhere('o.createdAt < :weekStart', { weekStart })
        .getExists();

      // Si la setmana ha passat i no s'ha entregat, la nova comanda té createdAt = final de la setmana actual
      const createdAtDate = hasStaleUndelivered
        ? dayjs(weekEnd).startOf('day').toDate()
        : undefined;

      const order = this.orderRepo.create({
        clientName: sub.clientName,
        mitgesDotzenes: sub.mitgesDotzenes,
        subscriptionId: sub.id,
      });
      if (createdAtDate) {
        order.createdAt = createdAtDate;
      }
      created.push(await this.orderRepo.save(order));
    }

    return created;
  }

  /** Assegura que hi ha una comanda per la setmana següent. Si ja n'hi ha, no fa res. */
  async ensureNextWeekOrder(subscriptionId: string, currentOrderCreatedAt: Date): Promise<Order | null> {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId } });
    if (!sub || !sub.active) return null;

    const nextWeekStart = dayjs(currentOrderCreatedAt).add(1, 'week').startOf('isoWeek').toDate();
    const nextWeekEnd = dayjs(currentOrderCreatedAt).add(1, 'week').endOf('isoWeek').toDate();

    const existing = await this.orderRepo.findOne({
      where: {
        subscriptionId,
        createdAt: Between(nextWeekStart, nextWeekEnd),
      },
    });
    if (existing) return null;

    const order = this.orderRepo.create({
      clientName: sub.clientName,
      mitgesDotzenes: sub.mitgesDotzenes,
      subscriptionId: sub.id,
    });
    order.createdAt = dayjs(nextWeekEnd).startOf('day').toDate();
    return this.orderRepo.save(order);
  }

  /** Cobra el mes actual per una subscripció: marca totes les comandes del mes com a pagades i crea 1 transaction */
  async chargeMonth(id: string, userId: string, year?: number, month?: number) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscripció no trobada');

    const ref =
      year != null && month != null
        ? new Date(year, month - 1)
        : new Date();
    const monthStart = getMonthStart(ref);
    const monthEnd = getMonthEnd(ref);

    const orders = await this.orderRepo.find({
      where: {
        subscriptionId: id,
        paid: false,
        createdAt: Between(monthStart, monthEnd),
      },
    });

    const totalMitges = orders.reduce((s, o) => s + o.mitgesDotzenes, 0);
    const amount =
      sub.amountPerMonth != null && sub.amountPerMonth > 0
        ? sub.amountPerMonth
        : (() => {
            const pricePerUnit =
              parseFloat(this.config.get('PRICE_PER_MITJA_DOTZENA', '2.5')) || 2.5;
            return totalMitges * pricePerUnit;
          })();

    const monthStr = `${ref.getMonth() + 1}/${ref.getFullYear()}`;
    const desc =
      sub.amountPerMonth != null && sub.amountPerMonth > 0
        ? `Subscripció: ${sub.clientName} - ${monthStr} (${orders.length} setmanes)`
        : `Subscripció: ${sub.clientName} - ${monthStr} (${orders.length} setmanes, ${totalMitges} mitges dotzenes)`;

    await this.transactionService.create(userId, {
      userId,
      clientName: sub.clientName,
      type: 'income',
      amount,
      description: desc,
      date: new Date().toISOString().split('T')[0],
    });

    for (const order of orders) {
      order.paid = true;
      await this.orderRepo.save(order);
    }

    return { orders, amount };
  }
}
