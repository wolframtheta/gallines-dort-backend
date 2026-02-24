import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionsTable1771266655868 implements MigrationInterface {
  name = 'CreateSubscriptionsTable1771266655868';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('subscriptions');
    if (!tableExists) {
      await queryRunner.query(`
        CREATE TABLE "subscriptions" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "clientName" character varying NOT NULL,
          "mitgesDotzenes" real NOT NULL DEFAULT 0,
          "active" boolean NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
  }
}
