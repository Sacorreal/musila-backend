import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipRole } from 'src/authorization/entities/membership-role.entity';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { Role } from 'src/authorization/entities/role.entity';
import { RoleSource } from 'src/authorization/entities/role-source.enum';
import { Plan } from 'src/entitlements/entities/plan.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, Repository } from 'typeorm';
import { MembershipStatus } from './entities/membership-status.enum';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationType } from './entities/organization-type.enum';
import { Tenant } from './entities/tenant.entity';
import { TenantType } from './entities/tenant-type.enum';
import { Trackspace } from './entities/trackspace.entity';

export interface CreateOrganizationParams {
  name: string;
  slug: string;
  type: OrganizationType;
  /** Plan B2B a contratar al crear (opcional). */
  planKey?: string;
  /** Usuario existente que queda como Organization Admin inicial (opcional). */
  adminUserId?: string;
}

export interface UpdateTrackspaceParams {
  name?: string;
  logoUrl?: string | null;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Trackspace)
    private readonly trackspaceRepository: Repository<Trackspace>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
  ) {}

  async findById(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: { tenant: true },
    });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }
    return organization;
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({ relations: { tenant: true } });
  }

  /**
   * Crea tenant + organización + trackspace default en una sola transacción
   * y, opcionalmente, la subscription B2B inicial y el Organization Admin.
   */
  async createOrganization(
    params: CreateOrganizationParams,
    invitedBy?: string,
  ): Promise<Organization> {
    const existing = await this.organizationRepository.findOne({ where: { slug: params.slug } });
    if (existing) {
      throw new BadRequestException(`Ya existe una organización con el slug '${params.slug}'`);
    }

    const organization = await this.dataSource.transaction(async (manager) => {
      const tenant = await manager.save(
        manager.create(Tenant, {
          type: TenantType.ORGANIZATION,
          slug: params.slug,
          name: params.name,
        }),
      );

      const created = await manager.save(
        manager.create(Organization, {
          tenantId: tenant.id,
          name: params.name,
          slug: params.slug,
          type: params.type,
        }),
      );

      await manager.save(
        manager.create(Trackspace, {
          organizationId: created.id,
          name: params.name,
          isDefault: true,
        }),
      );

      if (params.planKey) {
        const plan = await manager.findOne(Plan, { where: { key: params.planKey } });
        if (!plan) {
          throw new BadRequestException(`El plan '${params.planKey}' no existe`);
        }
        await manager.save(
          manager.create(Subscription, {
            subjectType: SubjectType.ORGANIZATION,
            subjectId: created.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            startAt: new Date(),
          }),
        );
      }

      if (params.adminUserId) {
        const adminRole = await manager.findOne(Role, {
          where: { key: 'ORGANIZATION_ADMIN', source: RoleSource.SYSTEM },
        });
        if (!adminRole) {
          throw new BadRequestException(
            'No existe el rol SYSTEM ORGANIZATION_ADMIN; ejecuta los seeds de autorización',
          );
        }

        const membership = await manager.save(
          manager.create(OrganizationMembership, {
            organizationId: created.id,
            userId: params.adminUserId,
            status: MembershipStatus.ACTIVE,
            invitedBy,
            joinedAt: new Date(),
          }),
        );

        await manager.save(
          manager.create(MembershipRole, {
            membershipType: MembershipType.ORGANIZATION,
            membershipId: membership.id,
            roleId: adminRole.id,
            assignedBy: invitedBy,
          }),
        );
      }

      return created;
    });

    if (params.adminUserId) {
      this.eventBus.emit('authorization.membership.updated', { userId: params.adminUserId });
    }

    return organization;
  }

  async updateOrganization(
    organizationId: string,
    changes: Partial<Pick<Organization, 'name' | 'type' | 'isActive'>>,
  ): Promise<Organization> {
    const organization = await this.findById(organizationId);
    Object.assign(organization, changes);
    return this.organizationRepository.save(organization);
  }

  async findTrackspaces(organizationId: string): Promise<Trackspace[]> {
    return this.trackspaceRepository.find({ where: { organizationId } });
  }

  /** Personalización del workspace: nombre y logo (§2 del requerimiento). */
  async updateTrackspace(
    organizationId: string,
    trackspaceId: string,
    changes: UpdateTrackspaceParams,
  ): Promise<Trackspace> {
    const trackspace = await this.trackspaceRepository.findOne({
      where: { id: trackspaceId, organizationId },
    });
    if (!trackspace) {
      throw new NotFoundException('Trackspace no encontrado en esta organización');
    }

    if (changes.name !== undefined) trackspace.name = changes.name;
    if (changes.logoUrl !== undefined) trackspace.logoUrl = changes.logoUrl ?? undefined;

    return this.trackspaceRepository.save(trackspace);
  }
}
