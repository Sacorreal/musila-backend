import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

import { UsersService } from 'src/users/users.service';
import { AuditLogService } from 'src/users/audit-log.service';

import { UserPasskey } from '../entities/user-passkey.entity';
import { WebauthnChallengeType } from '../entities/webauthn-challenge-type.enum';
import { extractChallengeFromClientData } from '../utils/webauthn-client-data.util';
import { ChallengeStoreService } from './challenge-store.service';
import { WebauthnService } from './webauthn.service';

/** Contexto de request para auditoría (§14, §21). */
export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface PasskeySummary {
  id: string;
  name: string | null;
  deviceType: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

/**
 * Orquesta las ceremonias de Passkey (registro y autenticación) y su gestión
 * (listar, renombrar, revocar). Persiste solo clave pública y metadatos;
 * nunca la clave privada ni biometría (§5). Toda operación queda auditada.
 */
@Injectable()
export class PasskeyService {
  constructor(
    @InjectRepository(UserPasskey)
    private readonly passkeyRepo: Repository<UserPasskey>,
    private readonly webauthn: WebauthnService,
    private readonly challengeStore: ChallengeStoreService,
    private readonly usersService: UsersService,
    private readonly auditLog: AuditLogService,
  ) {}

  // ── Registro ───────────────────────────────────────────────────────

  async generateRegistrationOptions(
    userId: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const user = await this.usersService.findOneUserService(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const active = await this.findActiveByUser(userId);
    const options = await this.webauthn.generateRegistrationOptions({
      userId,
      userName: user.email,
      userDisplayName: `${user.name} ${user.lastName ?? ''}`.trim(),
      excludeCredentials: active.map((p) => ({
        credentialId: p.credentialId,
        transports: p.transports as never,
      })),
    });

    await this.challengeStore.create(
      options.challenge,
      WebauthnChallengeType.REGISTRATION,
      userId,
    );

    return options;
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    name: string | undefined,
    ctx: RequestContext,
  ): Promise<PasskeySummary> {
    const stored = await this.challengeStore.consume(
      extractChallengeFromClientData(response.response.clientDataJSON),
      WebauthnChallengeType.REGISTRATION,
    );

    if (stored.userId !== userId) {
      throw new BadRequestException('El challenge no corresponde al usuario');
    }

    const verified = await this.webauthn.verifyRegistration({
      response,
      expectedChallenge: stored.challenge,
    });

    if (!verified) {
      throw new BadRequestException('No se pudo verificar la Passkey');
    }

    const exists = await this.passkeyRepo.findOne({
      where: { credentialId: verified.credentialId },
    });
    if (exists) {
      throw new ConflictException('Esta Passkey ya está registrada');
    }

    const passkey = await this.passkeyRepo.save(
      this.passkeyRepo.create({
        userId,
        credentialId: verified.credentialId,
        publicKey: verified.publicKey,
        signCount: verified.signCount,
        aaguid: verified.aaguid,
        deviceType: verified.deviceType,
        backedUp: verified.backedUp,
        transports: verified.transports,
        name: name?.trim() || undefined,
      }),
    );

    await this.auditLog.log(
      userId,
      'PASSKEY_REGISTERED',
      { passkeyId: passkey.id, deviceType: passkey.deviceType, userAgent: ctx.userAgent },
      ctx.ip,
    );

    return this.toSummary(passkey);
  }

  // ── Autenticación (login) ──────────────────────────────────────────

  async generateAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
    // Passkeys "discoverable": el navegador ofrece las credenciales que tenga
    // para el RP, sin que Musila revele qué usuario está intentando entrar.
    const options = await this.webauthn.generateAuthenticationOptions({});
    await this.challengeStore.create(
      options.challenge,
      WebauthnChallengeType.AUTHENTICATION,
    );
    return options;
  }

  /**
   * Verifica la aserción de login y devuelve el `userId` autenticado para que
   * el AuthService emita la sesión/token con el sistema existente (§11).
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    ctx: RequestContext,
  ): Promise<{ userId: string }> {
    const stored = await this.challengeStore.consume(
      extractChallengeFromClientData(response.response.clientDataJSON),
      WebauthnChallengeType.AUTHENTICATION,
    );

    const passkey = await this.passkeyRepo.findOne({
      where: { credentialId: response.id },
    });

    if (!passkey || passkey.revokedAt) {
      await this.auditLog.log(
        passkey?.userId ?? '00000000-0000-0000-0000-000000000000',
        'AUTHENTICATION_FAILED',
        { reason: 'passkey_not_found_or_revoked', userAgent: ctx.userAgent },
        ctx.ip,
      );
      throw new BadRequestException('Passkey no válida o revocada');
    }

    const verification = await this.webauthn.verifyAuthentication({
      response,
      expectedChallenge: stored.challenge,
      credential: {
        credentialId: passkey.credentialId,
        publicKey: passkey.publicKey,
        signCount: passkey.signCount,
        transports: passkey.transports as never,
      },
    });

    if (!verification.verified) {
      await this.auditLog.log(
        passkey.userId,
        'AUTHENTICATION_FAILED',
        { reason: 'signature_invalid', passkeyId: passkey.id, userAgent: ctx.userAgent },
        ctx.ip,
      );
      throw new BadRequestException('No se pudo verificar la firma de la Passkey');
    }

    passkey.signCount = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    await this.passkeyRepo.save(passkey);

    await this.auditLog.log(
      passkey.userId,
      'PASSKEY_AUTHENTICATED',
      { passkeyId: passkey.id, userAgent: ctx.userAgent },
      ctx.ip,
    );

    return { userId: passkey.userId };
  }

  // ── Gestión (§13, §14) ─────────────────────────────────────────────

  async list(userId: string): Promise<PasskeySummary[]> {
    const passkeys = await this.findActiveByUser(userId);
    return passkeys.map((p) => this.toSummary(p));
  }

  async rename(
    userId: string,
    id: string,
    name: string,
    ctx: RequestContext,
  ): Promise<PasskeySummary> {
    const passkey = await this.getOwned(userId, id);
    passkey.name = name.trim();
    await this.passkeyRepo.save(passkey);
    await this.auditLog.log(userId, 'PASSKEY_RENAMED', { passkeyId: id }, ctx.ip);
    return this.toSummary(passkey);
  }

  async revoke(
    userId: string,
    id: string,
    actorId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const passkey = await this.getOwned(userId, id);
    passkey.revokedAt = new Date();
    await this.passkeyRepo.save(passkey);
    await this.auditLog.log(
      userId,
      'PASSKEY_REVOKED',
      { passkeyId: id, actorId, userAgent: ctx.userAgent },
      ctx.ip,
    );
  }

  /** Cantidad de passkeys activas — usado por MfaService para el estado. */
  async countActive(userId: string): Promise<number> {
    return this.passkeyRepo.count({
      where: { userId, revokedAt: IsNull() },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private async findActiveByUser(userId: string): Promise<UserPasskey[]> {
    return this.passkeyRepo.find({
      where: { userId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  private async getOwned(userId: string, id: string): Promise<UserPasskey> {
    const passkey = await this.passkeyRepo.findOne({ where: { id } });
    if (!passkey || passkey.userId !== userId || passkey.revokedAt) {
      throw new NotFoundException('Passkey no encontrada');
    }
    return passkey;
  }

  private toSummary(p: UserPasskey): PasskeySummary {
    return {
      id: p.id,
      name: p.name ?? null,
      deviceType: p.deviceType ?? null,
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt ?? null,
    };
  }
}
