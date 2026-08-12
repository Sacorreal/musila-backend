import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { PublisherCommissionPolicy } from './entities/publisher-commission-policy.entity';
import { PublisherRosterCommission } from './entities/publisher-roster-commission.entity';
import {
  PublisherCommissionPolicyView,
  PublisherCommissionSnapshotEntry,
  RosterCommissionView,
} from './publisher-commission.types';

export interface RosterCommissionInput {
  userId: string;
  percentage: number;
}

/**
 * Gestiona la configuración de comisión de una publisher: el toggle global y el
 * porcentaje por miembro del roster. La resolución del snapshot (`resolveSnapshot`)
 * es la fuente de verdad del freeze que se congela en `RequestedTrack`.
 */
@Injectable()
export class PublisherCommissionService {
  constructor(
    @InjectRepository(PublisherCommissionPolicy)
    private readonly policyRepo: Repository<PublisherCommissionPolicy>,
    @InjectRepository(PublisherRosterCommission)
    private readonly rosterCommissionRepo: Repository<PublisherRosterCommission>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /** Toggle + roster con su porcentaje (0 por defecto para quien no lo tenga). */
  async getPolicy(organizationId: string): Promise<PublisherCommissionPolicyView> {
    await this.assertPublisher(organizationId);
    const policy = await this.policyRepo.findOne({ where: { organizationId } });
    const roster = await this.listRosterWithCommissions(organizationId);
    return {
      organizationId,
      commissionEnabled: policy?.commissionEnabled ?? false,
      roster,
    };
  }

  /** Activa o desactiva la comisión (upsert por `organizationId` único). */
  async setEnabled(organizationId: string, enabled: boolean): Promise<PublisherCommissionPolicyView> {
    await this.assertPublisher(organizationId);
    let policy = await this.policyRepo.findOne({ where: { organizationId } });
    if (!policy) {
      policy = this.policyRepo.create({ organizationId });
    }
    policy.commissionEnabled = enabled;
    await this.policyRepo.save(policy);
    return this.getPolicy(organizationId);
  }

  /** Bulk upsert de porcentajes por miembro del roster. */
  async upsertRosterCommissions(
    organizationId: string,
    items: RosterCommissionInput[],
  ): Promise<PublisherCommissionPolicyView> {
    await this.assertPublisher(organizationId);

    const activeUserIds = await this.activeRosterUserIds(organizationId);
    for (const item of items) {
      if (item.percentage < 0 || item.percentage > 100) {
        throw new BadRequestException(`Porcentaje inválido para ${item.userId}: debe estar entre 0 y 100`);
      }
      if (!activeUserIds.has(item.userId)) {
        throw new BadRequestException(`El usuario ${item.userId} no es miembro activo del roster`);
      }
    }

    for (const item of items) {
      let row = await this.rosterCommissionRepo.findOne({
        where: { organizationId, userId: item.userId },
      });
      if (!row) {
        row = this.rosterCommissionRepo.create({ organizationId, userId: item.userId });
      }
      row.percentage = item.percentage;
      await this.rosterCommissionRepo.save(row);
    }

    return this.getPolicy(organizationId);
  }

  /** Miembros ACTIVE del roster con su porcentaje configurado. */
  async listRosterWithCommissions(organizationId: string): Promise<RosterCommissionView[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      relations: { user: true },
    });
    if (!members.length) return [];

    const commissions = await this.rosterCommissionRepo.find({ where: { organizationId } });
    const pctByUser = new Map(commissions.map((c) => [c.userId, Number(c.percentage)]));

    return members.map((m) => ({
      userId: m.userId,
      name: [m.user.name, m.user.lastName].filter(Boolean).join(' ').trim(),
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      percentage: pctByUser.get(m.userId) ?? 0,
    }));
  }

  /**
   * Resuelve el snapshot de comisión para los vendedores del reparto: por cada
   * beneficiario que sea miembro ACTIVE del roster de una organización PUBLISHER
   * con la comisión activada y porcentaje > 0. Se usa solo en el freeze.
   */
  async resolveSnapshot(beneficiaryUserIds: string[]): Promise<PublisherCommissionSnapshotEntry[]> {
    const uniqueUserIds = [...new Set(beneficiaryUserIds)];
    if (!uniqueUserIds.length) return [];

    const memberships = await this.rosterRepo.find({
      where: {
        userId: In(uniqueUserIds),
        status: MembershipStatus.ACTIVE,
        organization: { type: OrganizationType.PUBLISHER },
      },
      relations: { organization: true },
    });
    if (!memberships.length) return [];

    const organizationIds = [...new Set(memberships.map((m) => m.organizationId))];
    const [policies, commissions] = await Promise.all([
      this.policyRepo.find({ where: { organizationId: In(organizationIds) } }),
      this.rosterCommissionRepo.find({ where: { organizationId: In(organizationIds) } }),
    ]);
    const enabledOrgs = new Set(
      policies.filter((p) => p.commissionEnabled).map((p) => p.organizationId),
    );
    const pctByOrgUser = new Map(
      commissions.map((c) => [`${c.organizationId}:${c.userId}`, Number(c.percentage)]),
    );

    const snapshot: PublisherCommissionSnapshotEntry[] = [];
    for (const membership of memberships) {
      if (!enabledOrgs.has(membership.organizationId)) continue;
      const percentage = pctByOrgUser.get(`${membership.organizationId}:${membership.userId}`) ?? 0;
      if (percentage <= 0) continue;
      snapshot.push({
        beneficiaryUserId: membership.userId,
        publisherOrganizationId: membership.organizationId,
        percentage,
      });
    }
    return snapshot;
  }

  private async activeRosterUserIds(organizationId: string): Promise<Set<string>> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
    });
    return new Set(members.map((m) => m.userId));
  }

  private async assertPublisher(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new BadRequestException('La comisión de anticipo solo aplica a organizaciones tipo PUBLISHER');
    }
  }
}
