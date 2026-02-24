import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmountPerMonthToSubscriptions1771266655870 implements MigrationInterface {
  name = 'AddAmountPerMonthToSubscriptions1771266655870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('subscriptions', 'amountPerMonth');
    if (!hasColumn) {
      await queryRunner.query(`
        ALTER TABLE "subscriptions" ADD "amountPerMonth" real
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "amountPerMonth"`);
  }
}
