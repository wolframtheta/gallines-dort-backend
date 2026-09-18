import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSettlementToTransactions1771280000000
  implements MigrationInterface
{
  name = 'AddIsSettlementToTransactions1771280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "isSettlement" boolean NOT NULL DEFAULT false`,
    );
    // Mark existing payments as settlements (they were created from the manual ingresos page)
    await queryRunner.query(
      `UPDATE "transactions" SET "isSettlement" = true WHERE "paymentGroupId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "isSettlement"`,
    );
  }
}
