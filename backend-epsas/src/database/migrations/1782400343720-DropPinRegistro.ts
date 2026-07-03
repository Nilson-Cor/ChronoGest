import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPinRegistro1782400343720 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "aplicativos" DROP COLUMN IF EXISTS "pin_registro"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "aplicativos" ADD COLUMN "pin_registro" character varying(20) NOT NULL DEFAULT '1234'`);
    }
}
