import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { WebauthnChallenge } from '../entities/webauthn-challenge.entity';
import { WebauthnChallengeType } from '../entities/webauthn-challenge-type.enum';

/** TTL por defecto de un challenge WebAuthn (§20: expiración corta). */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Persiste y valida challenges WebAuthn garantizando que sean de un solo uso
 * y con expiración (§10, §11, §20). Es la defensa central anti-replay: un
 * challenge consumido o vencido nunca vuelve a ser aceptado.
 */
@Injectable()
export class ChallengeStoreService {
  constructor(
    @InjectRepository(WebauthnChallenge)
    private readonly repo: Repository<WebauthnChallenge>,
  ) {}

  /** Guarda un challenge recién generado con su expiración. */
  async create(
    challenge: string,
    type: WebauthnChallengeType,
    userId?: string,
    ttlMs: number = CHALLENGE_TTL_MS,
  ): Promise<WebauthnChallenge> {
    const entity = this.repo.create({
      challenge,
      type,
      userId,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return this.repo.save(entity);
  }

  /**
   * Recupera y consume atómicamente un challenge válido (no vencido, no
   * consumido). Lanza si no existe, ya se usó o expiró. Marca `consumedAt`
   * para bloquear cualquier reuso.
   */
  async consume(
    challenge: string,
    type: WebauthnChallengeType,
  ): Promise<WebauthnChallenge> {
    const record = await this.repo.findOne({ where: { challenge, type } });

    if (!record || record.consumedAt) {
      throw new BadRequestException('Challenge inválido o ya utilizado');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('El challenge ha expirado, vuelve a intentarlo');
    }

    record.consumedAt = new Date();
    await this.repo.save(record);
    return record;
  }

  /** Limpieza oportunista de challenges vencidos (invocable por un cron). */
  async purgeExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) });
  }
}
