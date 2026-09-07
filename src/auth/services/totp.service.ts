import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';

/** Tolerancia de deriva de reloj (±1 paso de 30s) para verificar TOTP. */
const TOTP_EPOCH_TOLERANCE_SECONDS = 30;

import { UsersService } from 'src/users/users.service';
import { AuditLogService } from 'src/users/audit-log.service';

import { UserTotpFactor } from '../entities/user-totp-factor.entity';
import { SecretCipherService } from '../crypto/secret-cipher.service';
import { WebauthnConfig } from '../config/webauthn.config';

export interface TotpSetupResult {
  /** Data URL del código QR para escanear en la app de autenticación. */
  qrCodeDataUrl: string;
  /** Secreto en texto para introducción manual (se muestra una sola vez). */
  manualEntryKey: string;
}

/**
 * Segundo factor TOTP (§7): fallback y método alternativo cuando la política lo
 * permita. El secreto se cifra en reposo (AES-256-GCM) y nunca se registra en
 * claro. No se usa SMS como MFA principal.
 */
@Injectable()
export class TotpService {
  constructor(
    @InjectRepository(UserTotpFactor)
    private readonly totpRepo: Repository<UserTotpFactor>,
    private readonly cipher: SecretCipherService,
    private readonly usersService: UsersService,
    private readonly auditLog: AuditLogService,
    private readonly webauthnConfig: WebauthnConfig,
  ) {}

  /**
   * Inicia el alta del factor: genera un secreto nuevo, lo cifra y lo guarda
   * sin confirmar (`confirmedAt = null`). Devuelve el QR y la clave manual.
   */
  async setup(userId: string): Promise<TotpSetupResult> {
    const user = await this.usersService.findOneUserService(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.totpRepo.findOne({ where: { userId } });
    if (existing?.confirmedAt) {
      throw new ConflictException('El TOTP ya está configurado');
    }

    const secret = generateSecret();
    const otpauth = generateURI({
      issuer: this.webauthnConfig.rpName,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    const encrypted = this.cipher.encrypt(secret);
    if (existing) {
      existing.secretEncrypted = encrypted;
      existing.confirmedAt = undefined;
      await this.totpRepo.save(existing);
    } else {
      await this.totpRepo.save(
        this.totpRepo.create({ userId, secretEncrypted: encrypted }),
      );
    }

    return { qrCodeDataUrl, manualEntryKey: secret };
  }

  /** Confirma el factor validando un primer código generado por el usuario. */
  async confirm(userId: string, token: string, ip?: string): Promise<void> {
    const factor = await this.totpRepo.findOne({ where: { userId } });
    if (!factor) {
      throw new NotFoundException('No hay un TOTP pendiente de confirmar');
    }

    const secret = this.cipher.decrypt(factor.secretEncrypted);
    if (!verifySync({ token, secret, epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS }).valid) {
      throw new BadRequestException('Código TOTP inválido');
    }

    factor.confirmedAt = new Date();
    await this.totpRepo.save(factor);
    await this.auditLog.log(userId, 'MFA_ENABLED', { method: 'TOTP' }, ip);
  }

  /** Verifica un código contra el factor confirmado (login/step-up). */
  async verify(userId: string, token: string): Promise<boolean> {
    const factor = await this.totpRepo.findOne({ where: { userId } });
    if (!factor?.confirmedAt) return false;

    const secret = this.cipher.decrypt(factor.secretEncrypted);
    return verifySync({ token, secret, epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS }).valid;
  }

  async isEnabled(userId: string): Promise<boolean> {
    const factor = await this.totpRepo.findOne({ where: { userId } });
    return Boolean(factor?.confirmedAt);
  }

  async disable(userId: string, ip?: string): Promise<void> {
    const factor = await this.totpRepo.findOne({ where: { userId } });
    if (!factor) return;
    await this.totpRepo.remove(factor);
    await this.auditLog.log(userId, 'MFA_DISABLED', { method: 'TOTP' }, ip);
  }
}
