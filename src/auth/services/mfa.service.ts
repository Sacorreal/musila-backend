import { Injectable } from '@nestjs/common';
import { OrganizationSecurityPolicyService } from 'src/organizations/organization-security-policy.service';
import { PasskeyService } from './passkey.service';
import { TotpService } from './totp.service';
import { RecoveryCodeService } from './recovery-code.service';

export interface MfaStatus {
  mfaEnabled: boolean;
  passkeysCount: number;
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
  availableMethods: ('PASSKEY' | 'TOTP' | 'RECOVERY_CODE')[];
  /** Presente solo cuando se consulta en el contexto de una organización. */
  organizationPolicy?: {
    organizationId: string;
    mfaRequired: boolean;
    passkeyRequired: boolean;
    totpAllowed: boolean;
    satisfied: boolean;
    missing: ('MFA' | 'PASSKEY' | 'RECOVERY_CODES')[];
  };
}

/**
 * Vista unificada del estado MFA del usuario y evaluación de cumplimiento
 * frente a la política de una organización (§3, §16). No concede permisos:
 * solo informa qué factores existen y si satisfacen la política tenant-aware.
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly passkeyService: PasskeyService,
    private readonly totpService: TotpService,
    private readonly recoveryCodeService: RecoveryCodeService,
    private readonly orgPolicyService: OrganizationSecurityPolicyService,
  ) {}

  async getStatus(userId: string, organizationId?: string): Promise<MfaStatus> {
    const [passkeysCount, totpEnabled, recoveryCodesRemaining] = await Promise.all([
      this.passkeyService.countActive(userId),
      this.totpService.isEnabled(userId),
      this.recoveryCodeService.countUnused(userId),
    ]);

    const availableMethods: MfaStatus['availableMethods'] = [];
    if (passkeysCount > 0) availableMethods.push('PASSKEY');
    if (totpEnabled) availableMethods.push('TOTP');
    if (recoveryCodesRemaining > 0) availableMethods.push('RECOVERY_CODE');

    const status: MfaStatus = {
      mfaEnabled: passkeysCount > 0 || totpEnabled,
      passkeysCount,
      totpEnabled,
      recoveryCodesRemaining,
      availableMethods,
    };

    if (organizationId) {
      status.organizationPolicy = await this.evaluateOrganization(
        organizationId,
        status,
      );
    }

    return status;
  }

  /**
   * Determina si el usuario cumple la política de la organización (§3.2). Lo
   * usa el guard de acceso al workspace protegido para bloquear a quien no la
   * cumpla, sin mezclar autenticación con autorización.
   */
  async evaluateCompliance(
    userId: string,
    organizationId: string,
  ): Promise<{ satisfied: boolean; missing: ('MFA' | 'PASSKEY' | 'RECOVERY_CODES')[] }> {
    const status = await this.getStatus(userId);
    const evaluation = await this.evaluateOrganization(organizationId, status);
    return { satisfied: evaluation.satisfied, missing: evaluation.missing };
  }

  private async evaluateOrganization(
    organizationId: string,
    status: MfaStatus,
  ): Promise<NonNullable<MfaStatus['organizationPolicy']>> {
    const policy = await this.orgPolicyService.get(organizationId);
    const mfaRequired = policy.mfaRequired || policy.passkeyRequired;

    const missing: ('MFA' | 'PASSKEY' | 'RECOVERY_CODES')[] = [];
    if (policy.passkeyRequired && status.passkeysCount === 0) {
      missing.push('PASSKEY');
    } else if (mfaRequired && !status.mfaEnabled) {
      missing.push('MFA');
    }
    if (policy.recoveryCodesRequired && status.recoveryCodesRemaining === 0) {
      missing.push('RECOVERY_CODES');
    }

    return {
      organizationId,
      mfaRequired,
      passkeyRequired: policy.passkeyRequired,
      totpAllowed: policy.totpAllowed,
      satisfied: missing.length === 0,
      missing,
    };
  }
}
