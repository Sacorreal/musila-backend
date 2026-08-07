import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Genera el número legible y secuencial del expediente: `EXP-MUS-{año}-{6 dígitos}`.
 *
 * A diferencia del registro del Certificado de Autoría (no secuencial, basado
 * en timestamp — ver `certificates/utils/certificate-registry-number.util.ts`),
 * aquí el requerimiento exige legibilidad secuencial, lo que introduce una
 * condición de carrera real si dos expedientes se crean al mismo tiempo. Se
 * resuelve con una secuencia nativa de Postgres por año (atómica a nivel de
 * motor, sin locks explícitos): se crea on-demand la primera vez que se pide
 * un número para ese año. El `año` viene siempre de `Date`, nunca de input
 * externo, por lo que interpolarlo en el nombre de la secuencia es seguro.
 *
 * Debe invocarse dentro de la misma transacción que crea el `RegistrationFile`
 * (pasar el `EntityManager` del `QueryRunner` en curso), para que un rollback
 * del insert no dependa de números "perdidos" — los gaps ocasionales son
 * aceptables, los duplicados no lo son (la columna `case_number` es además
 * `unique` como red de seguridad).
 */
@Injectable()
export class RegistrationNumberService {
  async generateCaseNumber(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const sequenceName = `registration_file_seq_${year}`;

    await manager.query(`CREATE SEQUENCE IF NOT EXISTS "${sequenceName}" START 1`);
    const rows: { nextval: string }[] = await manager.query(`SELECT nextval('${sequenceName}') AS nextval`);
    const sequential = rows[0].nextval;

    return `EXP-MUS-${year}-${sequential.padStart(6, '0')}`;
  }
}
