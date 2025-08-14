import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveClientType1755161459431 implements MigrationInterface {
  name = 'RemoveClientType1755161459431';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Spaces" DROP CONSTRAINT "CHK_fa82c97a1163cdbc4af19da93b"`,
    );
    await queryRunner.query(`ALTER TABLE "Spaces" DROP COLUMN "clientType"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Spaces" ADD "clientType" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "Spaces" ADD CONSTRAINT "CHK_fa82c97a1163cdbc4af19da93b" CHECK (("clientType" = ANY (ARRAY['OWEN'::text, 'VALIDATOR'::text])))`,
    );
  }
}
