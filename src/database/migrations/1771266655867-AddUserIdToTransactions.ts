import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToTransactions1771266655867 implements MigrationInterface {
    name = 'AddUserIdToTransactions1771266655867'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_8cece87df4d973a63719be68d33"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "participantId"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "clientName" character varying`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "clientName"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "participantId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_8cece87df4d973a63719be68d33" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
