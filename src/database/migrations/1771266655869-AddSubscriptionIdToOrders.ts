import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionIdToOrders1771266655869 implements MigrationInterface {
  name = 'AddSubscriptionIdToOrders1771266655869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('orders', 'subscriptionId');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE "orders" ADD "subscriptionId" uuid
      `);
      await queryRunner.query(`
        ALTER TABLE "orders"
        ADD CONSTRAINT "FK_orders_subscription"
        FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_subscription"`
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "subscriptionId"`);
  }
}
