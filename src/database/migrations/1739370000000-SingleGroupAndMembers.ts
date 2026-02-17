import { MigrationInterface, QueryRunner } from 'typeorm';

export class SingleGroupAndMembers1739370000000 implements MigrationInterface {
  name = 'SingleGroupAndMembers1739370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "groupId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_group_members_user_group" UNIQUE ("userId", "groupId"),
        CONSTRAINT "FK_group_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_members_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "participants" ADD "userId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "participants" ADD CONSTRAINT "FK_participants_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "participants" DROP CONSTRAINT "FK_participants_user"`
    );
    await queryRunner.query(
      `ALTER TABLE "participants" DROP COLUMN "userId"`
    );
    await queryRunner.query(`DROP TABLE "group_members"`);
  }
}
