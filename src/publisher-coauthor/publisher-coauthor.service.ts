import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';
import { PublisherRosterCoauthorDefault } from './entities/publisher-roster-coauthor-default.entity';
import {
  PublisherCoauthorPolicyView,
  ResolvedPublisherCoauthor,
  RosterCoauthorDefaultView,
} from './publisher-coauthor.types';

export interface RosterCoauthorDefaultInput {
  userId: string;
  enabled: boolean;
  role: CoauthorRole;
  percentage: number;
}

/**
 * Gestiona la configuración por la que una publisher queda como coautora por
 * defecto de un miembro de su roster (rol + porcentaje fijos). `resolveForUser`
 * es la fuente de verdad que consume `SplitService` para inyectar a la publisher
 * de forma obligatoria en cada split.
 */
@Injectable()
export class PublisherCoauthorService {
  constructor(
    @InjectRepository(PublisherRosterCoauthorDefault)
    private readonly defaultsRepo: Repository<PublisherRosterCoauthorDefault>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /** Roster ACTIVE con su configuración de coautoría por defecto. */
  async getPolicy(organizationId: string): Promise<PublisherCoauthorPolicyView> {
    await this.assertPublisher(organizationId);
    return {
      organizationId,
      roster: await this.listRosterWithDefaults(organizationId),
    };
  }

  /** Bulk upsert de la coautoría por defecto por miembro del roster. */
  async upsertRosterDefaults(
    organizationId: string,
    items: RosterCoauthorDefaultInput[],
  ): Promise<PublisherCoauthorPolicyView> {
    await this.assertPublisher(organizationId);

    const activeUserIds = await this.activeRosterUserIds(organizationId);
    for (const item of items) {
      if (!activeUserIds.has(item.userId)) {
        throw new BadRequestException(`El usuario ${item.userId} no es miembro activo del roster`);
      }
      if (item.enabled && item.percentage <= 0) {
        throw new BadRequestException(
          `Para activar la coautoría de ${item.userId} el porcentaje debe ser mayor a 0`,
        );
      }
    }

    for (const item of items) {
      let row = await this.defaultsRepo.findOne({
        where: { organizationId, userId: item.userId },
      });
      if (!row) {
        row = this.defaultsRepo.create({ organizationId, userId: item.userId });
      }
      row.enabled = item.enabled;
      row.role = item.role;
      row.percentage = item.percentage;
      await this.defaultsRepo.save(row);
    }

    return this.getPolicy(organizationId);
  }

  /** Miembros ACTIVE del roster con su configuración (por defecto deshabilitada). */
  async listRosterWithDefaults(organizationId: string): Promise<RosterCoauthorDefaultView[]> {
    const members = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
      relations: { user: true },
    });
    if (!members.length) return [];

    const defaults = await this.defaultsRepo.find({ where: { organizationId } });
    const byUser = new Map(defaults.map((d) => [d.userId, d]));

    return members.map((m) => {
      const config = byUser.get(m.userId);
      return {
        userId: m.userId,
        name: [m.user.name, m.user.lastName].filter(Boolean).join(' ').trim(),
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        enabled: config?.enabled ?? false,
        role: config?.role ?? CoauthorRole.COMPOSITOR,
        percentage: config ? Number(config.percentage) : 0,
      };
    });
  }

  /**
   * Resuelve las coautorías por defecto que deben inyectarse en el split que crea
   * `creatorUserId`: por cada organización PUBLISHER donde es miembro ACTIVE y
   * tiene la coautoría activada con porcentaje > 0. Se usa en la creación/edición
   * del split (inyección obligatoria) y para mostrar el objetivo en la UI.
   */
  async resolveForUser(creatorUserId: string): Promise<ResolvedPublisherCoauthor[]> {
    const memberships = await this.rosterRepo.find({
      where: {
        userId: creatorUserId,
        status: MembershipStatus.ACTIVE,
        organization: { type: OrganizationType.PUBLISHER },
      },
      relations: { organization: true },
    });
    if (!memberships.length) return [];

    const organizationIds = memberships.map((m) => m.organizationId);
    const defaults = await this.defaultsRepo.find({
      where: { organizationId: In(organizationIds), userId: creatorUserId, enabled: true },
    });
    const byOrg = new Map(defaults.map((d) => [d.organizationId, d]));

    const resolved: ResolvedPublisherCoauthor[] = [];
    for (const membership of memberships) {
      const config = byOrg.get(membership.organizationId);
      if (!config) continue;
      const percentage = Number(config.percentage);
      if (percentage <= 0) continue;
      resolved.push({
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        role: config.role,
        percentage,
      });
    }
    return resolved;
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
      throw new BadRequestException('La coautoría por defecto solo aplica a organizaciones tipo PUBLISHER');
    }
  }
}
