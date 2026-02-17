import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1739702476000 implements MigrationInterface {
    name = 'CreateOrdersTable1739702476000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Comprovar si la taula ja existeix
        const tableExists = await queryRunner.hasTable('orders');

        if (!tableExists) {
            await queryRunner.query(`
        CREATE TABLE "orders" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "clientName" character varying NOT NULL,
          "mitgesDotzenes" real NOT NULL DEFAULT 0,
          "paid" boolean NOT NULL DEFAULT false,
          "delivered" boolean NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_orders" PRIMARY KEY ("id")
        )
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    }
}
