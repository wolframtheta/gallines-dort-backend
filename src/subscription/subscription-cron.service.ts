import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionCronService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly config: ConfigService,
  ) {}

  /** Cada dia a les 8:00, revisa si cal generar comandes setmanals per a les subscripcions actives */
  @Cron('0 8 * * *', { timeZone: 'Europe/Madrid' })
  async handleWeeklyOrdersGeneration() {
    const enabled = this.config.get('CRON_WEEKLY_ORDERS_ENABLED', 'true');
    if (enabled === 'false' || enabled === '0') return;

    try {
      const created = await this.subscriptionService.generateWeeklyOrders();
      if (created.length > 0) {
        console.log(
          `[Cron] Generades ${created.length} comandes setmanals: ${created.map((o) => o.clientName).join(', ')}`
        );
      }
    } catch (err) {
      console.error('[Cron] Error generant comandes setmanals:', err);
    }
  }
}
