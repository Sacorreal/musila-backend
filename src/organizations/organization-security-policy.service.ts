import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationSecurityPolicy } from './entities/organization-security-policy.entity';
import { Organization } from './entities/organization.entity';

export interface SecurityPolicyView {
  organizationId: string;
  mfaRequired: boolean;
  passkeyRequired: boolean;
  totpAllowed: boolean;
  recoveryCodesRequired: boolean;
}

export interface UpdateSecurityPolicyInput {
  mfaRequired?: boolean;
  passkeyRequired?: boolean;
  totpAllowed?: boolean;
  recoveryCodesRequired?: boolean;
}

/**
 * Gestiona la `OrganizationSecurityPolicy` (§4). La evaluación es siempre
 * tenant-aware: se resuelve por `organizationId`, de modo que una misma persona
 * puede estar sujeta a políticas distintas según el `Membership` con el que
 * actúe. Esta política nunca modifica la configuración global del usuario.
 */
@Injectable()
export class OrganizationSecurityPolicyService {
  constructor(
    @InjectRepository(OrganizationSecurityPolicy)
    private readonly policyRepo: Repository<OrganizationSecurityPolicy>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Devuelve la política de la organización. Si aún no se ha configurado,
   * retorna un default seguro (sin MFA obligatoria, TOTP permitido) sin
   * persistirlo, para que el admin decida explícitamente.
   */
  async get(organizationId: string): Promise<SecurityPolicyView> {
    const policy = await this.policyRepo.findOne({ where: { organizationId } });
    if (policy) return this.toView(policy);

    await this.assertOrganizationExists(organizationId);
    return {
      organizationId,
      mfaRequired: false,
      passkeyRequired: false,
      totpAllowed: true,
      recoveryCodesRequired: false,
    };
  }

  /** Crea o actualiza la política (upsert por `organizationId` único). */
  async update(
    organizationId: string,
    input: UpdateSecurityPolicyInput,
  ): Promise<SecurityPolicyView> {
    await this.assertOrganizationExists(organizationId);

    let policy = await this.policyRepo.findOne({ where: { organizationId } });
    if (!policy) {
      policy = this.policyRepo.create({ organizationId });
    }

    Object.assign(policy, this.normalize(input, policy));
    const saved = await this.policyRepo.save(policy);
    return this.toView(saved);
  }

  /** ¿La organización exige MFA para acceder al workspace protegido? */
  async evaluateMfaRequired(organizationId: string): Promise<boolean> {
    const policy = await this.get(organizationId);
    // Exigir Passkey implica exigir MFA aunque no se marque explícitamente.
    return policy.mfaRequired || policy.passkeyRequired;
  }

  /** ¿La organización exige específicamente una Passkey? */
  async evaluatePasskeyRequired(organizationId: string): Promise<boolean> {
    const policy = await this.get(organizationId);
    return policy.passkeyRequired;
  }

  private normalize(
    input: UpdateSecurityPolicyInput,
    current: OrganizationSecurityPolicy,
  ): Partial<OrganizationSecurityPolicy> {
    const mfaRequired = input.mfaRequired ?? current.mfaRequired ?? false;
    const passkeyRequired = input.passkeyRequired ?? current.passkeyRequired ?? false;
    return {
      // Coherencia: si se exige Passkey, la MFA queda implícitamente requerida.
      mfaRequired: mfaRequired || passkeyRequired,
      passkeyRequired,
      totpAllowed: input.totpAllowed ?? current.totpAllowed ?? true,
      recoveryCodesRequired:
        input.recoveryCodesRequired ?? current.recoveryCodesRequired ?? false,
    };
  }

  private async assertOrganizationExists(organizationId: string): Promise<void> {
    const exists = await this.orgRepo.exists({ where: { id: organizationId } });
    if (!exists) throw new NotFoundException('Organización no encontrada');
  }

  private toView(policy: OrganizationSecurityPolicy): SecurityPolicyView {
    return {
      organizationId: policy.organizationId,
      mfaRequired: policy.mfaRequired,
      passkeyRequired: policy.passkeyRequired,
      totpAllowed: policy.totpAllowed,
      recoveryCodesRequired: policy.recoveryCodesRequired,
    };
  }
}
