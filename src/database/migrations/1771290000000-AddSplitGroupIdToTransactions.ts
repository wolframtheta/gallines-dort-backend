import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSplitGroupIdToTransactions1771290000000
  implements MigrationInterface
{
  name = 'AddSplitGroupIdToTransactions1771290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "splitGroupId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_splitGroupId" ON "transactions" ("splitGroupId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_transactions_splitGroupId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "splitGroupId"`,
    );
  }
}
