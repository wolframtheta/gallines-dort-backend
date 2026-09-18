import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentGroupIdToTransactions1771270000000
  implements MigrationInterface
{
  name = 'AddPaymentGroupIdToTransactions1771270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "paymentGroupId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_paymentGroupId" ON "transactions" ("paymentGroupId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transactions_paymentGroupId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "paymentGroupId"`,
    );
  }
}
