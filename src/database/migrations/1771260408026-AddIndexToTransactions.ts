import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexToTransactions1771260408026 implements MigrationInterface {
    name = 'AddIndexToTransactions1771260408026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_b8af63e38be1c6635a7c32c31e" ON "transactions" ("type", "date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b8af63e38be1c6635a7c32c31e"`);
    }

}
