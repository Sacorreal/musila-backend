import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { AuditLogService } from 'src/users/audit-log.service';
import { RecoveryCode } from '../entities/recovery-code.entity';

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 5; // 10 caracteres hex por bloque

/**
 * Recovery Codes de un solo uso (§6). Solo se persiste el hash; el texto plano
 * se devuelve una única vez al generar. La regeneración invalida (elimina) los
 * códigos anteriores. Toda operación queda auditada.
 */
@Injectable()
export class RecoveryCodeService {
  constructor(
    @InjectRepository(RecoveryCode)
    private readonly repo: Repository<RecoveryCode>,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Genera un lote nuevo. Devuelve los códigos en claro SOLO en esta llamada.
   * `regenerate=true` para el caso de regeneración (audita distinto).
   */
  async generate(userId: string, ip?: string, regenerate = false): Promise<string[]> {
    await this.repo.delete({ userId });

    const plainCodes: string[] = [];
    const entities: RecoveryCode[] = [];

    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const code = this.formatCode(randomBytes(RECOVERY_CODE_BYTES).toString('hex'));
      plainCodes.push(code);
      entities.push(
        this.repo.create({ userId, codeHash: await bcrypt.hash(code, 10) }),
      );
    }

    await this.repo.save(entities);
    await this.auditLog.log(
      userId,
      regenerate ? 'RECOVERY_CODES_REGENERATED' : 'RECOVERY_CODE_GENERATED',
      { count: RECOVERY_CODE_COUNT },
      ip,
    );

    return plainCodes;
  }

  async regenerate(userId: string, ip?: string): Promise<string[]> {
    return this.generate(userId, ip, true);
  }

  /**
   * Valida un código y lo consume (un solo uso). Devuelve true si era válido.
   * Compara contra los hashes no usados; al acertar marca `usedAt`.
   */
  async verifyAndConsume(userId: string, code: string, ip?: string): Promise<boolean> {
    const candidates = await this.repo.find({
      where: { userId, usedAt: IsNull() },
    });

    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.codeHash)) {
        candidate.usedAt = new Date();
        await this.repo.save(candidate);
        await this.auditLog.log(userId, 'RECOVERY_CODE_USED', {}, ip);
        return true;
      }
    }
    return false;
  }

  /** Cuántos códigos siguen disponibles (para el estado MFA). */
  async countUnused(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, usedAt: IsNull() } });
  }

  /** Formatea un hex a bloques legibles tipo `abcd-ef12-3456`. */
  private formatCode(hex: string): string {
    return (hex.match(/.{1,4}/g) ?? [hex]).join('-');
  }
}
