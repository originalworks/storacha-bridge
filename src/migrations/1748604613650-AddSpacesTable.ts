import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacesTable1748604613650 implements MigrationInterface {
  name = 'AddSpacesTable1748604613650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "Spaces" ("id" SERIAL NOT NULL, "walletAddress" character varying NOT NULL, "did" character varying, "proofBase64" character varying NOT NULL, "clientType" text NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fab3487ac87d7763f93b1b49e29" UNIQUE ("walletAddress"), CONSTRAINT "CHK_fa82c97a1163cdbc4af19da93b" CHECK ("clientType" IN ('OWEN', 'VALIDATOR')), CONSTRAINT "PK_5670e2fac81d3be55e034d7c3ff" PRIMARY KEY ("id"))`,
    );

    if (process.env.ENVIRONMENT === 'local') {
      await queryRunner.query(
        `INSERT INTO "Spaces" ("walletAddress", "clientType", "proofBase64") 
        VALUES ('0x0000000000000000000000000000000000000000', 'OWEN', '${process.env.LOCAL_OWEN_PROOF}'),
        ('0xaDAd7340C4992a8aC2a575042b4c22557871631e', 'VALIDATOR', '${process.env.LOCAL_VALIDATOR_PROOF}')
        `,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "Spaces"`);
  }
}
