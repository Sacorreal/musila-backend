import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

import { AuditLogService } from 'src/users/audit-log.service';

import { StepUpGrant } from '../entities/step-up-grant.entity';
import { UserPasskey } from '../entities/user-passkey.entity';
import { MfaMethod } from '../entities/mfa-method.enum';
import { WebauthnChallengeType } from '../entities/webauthn-challenge-type.enum';
import { extractChallengeFromClientData } from '../utils/webauthn-client-data.util';
import { ChallengeStoreService } from './challenge-store.service';
import { WebauthnService } from './webauthn.service';
import { TotpService } from './totp.service';
import type { RequestContext } from './passkey.service';
import { StepUpPolicyService } from '../step-up/step-up-policy.service';

/** Duración de una autorización de step-up (§15: ventana corta). */
const STEP_UP_GRANT_TTL_MS = 5 * 60 * 1000;

/**
 * Autenticación adicional para operaciones sensibles (§15). Emite un
 * `StepUpGrant` temporal tras superar un desafío fuerte (Passkey o TOTP según
 * la política). No concede permisos: solo prueba una re-autenticación reciente
 * que el `StepUpGuard` exige para el `scope` correspondiente.
 */
@Injectable()
export class StepUpAuthService {
  constructor(
    @InjectRepository(StepUpGrant)
    private readonly grantRepo: Repository<StepUpGrant>,
    @InjectRepository(UserPasskey)
    private readonly passkeyRepo: Repository<UserPasskey>,
    private readonly webauthn: WebauthnService,
    private readonly challengeStore: ChallengeStoreService,
    private readonly totpService: TotpService,
    private readonly auditLog: AuditLogService,
    private readonly policy: StepUpPolicyService,
  ) {}

  /** Genera opciones WebAuthn para un step-up con Passkey del usuario. */
  async challengePasskey(
    userId: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const passkeys = await this.passkeyRepo.find({
      where: { userId, revokedAt: IsNull() },
    });
    const options = await this.webauthn.generateAuthenticationOptions({
      allowCredentials: passkeys.map((p) => ({
        credentialId: p.credentialId,
        transports: p.transports as never,
      })),
    });
    await this.challengeStore.create(
      options.challenge,
      WebauthnChallengeType.STEP_UP,
      userId,
    );
    return options;
  }

  /** Verifica una aserción de Passkey y emite el grant para el `scope`. */
  async verifyPasskey(
    userId: string,
    scope: string,
    response: AuthenticationResponseJSON,
    ctx: RequestContext,
  ): Promise<{ grantedUntil: Date }> {
    const stored = await this.challengeStore.consume(
      extractChallengeFromClientData(response.response.clientDataJSON),
      WebauthnChallengeType.STEP_UP,
    );
    if (stored.userId !== userId) {
      throw new BadRequestException('El challenge no corresponde al usuario');
    }

    const passkey = await this.passkeyRepo.findOne({
      where: { credentialId: response.id },
    });
    if (!passkey || passkey.userId !== userId || passkey.revokedAt) {
      await this.auditStepUp(userId, scope, false, ctx, 'passkey_invalid');
      throw new BadRequestException('Passkey no válida');
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
      await this.auditStepUp(userId, scope, false, ctx, 'signature_invalid');
      throw new BadRequestException('No se pudo verificar la Passkey');
    }

    passkey.signCount = verification.authenticationInfo.newCounter;
    passkey.lastUsedAt = new Date();
    await this.passkeyRepo.save(passkey);

    return this.grant(userId, scope, MfaMethod.PASSKEY, ctx);
  }

  /** Verifica un código TOTP y emite el grant para el `scope`. */
  async verifyTotp(
    userId: string,
    scope: string,
    token: string,
    ctx: RequestContext,
  ): Promise<{ grantedUntil: Date }> {
    const { allowedMethods } = this.policy.resolve(scope);
    if (!allowedMethods.includes(MfaMethod.TOTP)) {
      await this.auditStepUp(userId, scope, false, ctx, 'method_not_allowed');
      throw new ForbiddenException({
        message: 'Esta operación exige Passkey',
        code: 'STEP_UP_METHOD_NOT_ALLOWED',
        scope,
        allowedMethods,
      });
    }

    const valid = await this.totpService.verify(userId, token);
    if (!valid) {
      await this.auditStepUp(userId, scope, false, ctx, 'totp_invalid');
      throw new BadRequestException('Código TOTP inválido');
    }
    return this.grant(userId, scope, MfaMethod.TOTP, ctx);
  }

  /**
   * Exige un grant válido (no vencido, no consumido) para el `scope`. Lo usa el
   * `StepUpGuard`. Lanza 403 con código STEP_UP_REQUIRED si no existe. Para
   * scopes CRITICAL (§15), consume el grant en un `update` atómico condicional
   * para que no pueda reutilizarse ni siquiera ante una carrera concurrente.
   */
  async assertValidGrant(userId: string, scope: string): Promise<void> {
    const grant = await this.grantRepo.findOne({
      where: {
        userId,
        scope,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });
    if (!grant) {
      throw new ForbiddenException({
        message: 'Se requiere autenticación adicional para esta operación',
        code: 'STEP_UP_REQUIRED',
        scope,
      });
    }

    const { oneTimeUse } = this.policy.resolve(scope);
    if (oneTimeUse) {
      const result = await this.grantRepo.update(
        { id: grant.id, consumedAt: IsNull() },
        { consumedAt: new Date() },
      );
      if (!result.affected) {
        throw new ForbiddenException({
          message: 'Se requiere autenticación adicional para esta operación',
          code: 'STEP_UP_REQUIRED',
          scope,
        });
      }
    }
  }

  private async grant(
    userId: string,
    scope: string,
    method: MfaMethod,
    ctx: RequestContext,
  ): Promise<{ grantedUntil: Date }> {
    const expiresAt = new Date(Date.now() + STEP_UP_GRANT_TTL_MS);
    await this.grantRepo.save(
      this.grantRepo.create({ userId, scope, method, expiresAt }),
    );
    await this.auditStepUp(userId, scope, true, ctx, undefined, method);
    return { grantedUntil: expiresAt };
  }

  private async auditStepUp(
    userId: string,
    scope: string,
    success: boolean,
    ctx: RequestContext,
    reason?: string,
    method?: MfaMethod,
  ): Promise<void> {
    await this.auditLog.log(
      userId,
      success ? 'MFA_STEP_UP_SUCCESS' : 'MFA_STEP_UP_FAILED',
      { scope, method, reason, userAgent: ctx.userAgent },
      ctx.ip,
    );
  }
}
