import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { User } from 'src/users/entities/user.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MembershipStatus } from './entities/membership-status.enum';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationType } from './entities/organization-type.enum';
import { Tenant } from './entities/tenant.entity';
import { TenantType } from './entities/tenant-type.enum';
import { Trackspace } from './entities/trackspace.entity';
import { OrganizationInviteService } from './organization-invite.service';

export interface CreateOrganizationParams {
  name: string;
  slug: string;
  type: OrganizationType;
  /** Plan B2B a contratar al crear (opcional). */
  planKey?: string;
  /** Email del Organization Admin inicial (obligatorio). */
  adminEmail: string;
  /** Nombre del Organization Admin, para personalizar el correo (opcional). */
  adminName?: string;
}

/** Resultado de resolver al Organization Admin al crear la organización. */
type AdminOutcome =
  | { type: 'existing'; userId: string; userName?: string }
  | { type: 'invited'; token: string };

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
    private readonly configService: ConfigService,
    private readonly organizationInviteService: OrganizationInviteService,
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
   * y, opcionalmente, la subscription B2B inicial. El Organization Admin
   * inicial se resuelve por email: si ya tiene cuenta se le asigna la
   * membership ACTIVE + rol; si no, se genera una invitación por email para
   * que complete su registro (§2/§4).
   */
  async createOrganization(
    params: CreateOrganizationParams,
    invitedBy?: string,
  ): Promise<Organization> {
    const existing = await this.organizationRepository.findOne({ where: { slug: params.slug } });
    if (existing) {
      throw new BadRequestException(`Ya existe una organización con el slug '${params.slug}'`);
    }

    const { organization, adminOutcome } = await this.dataSource.transaction(async (manager) => {
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

      const adminOutcome = await this.resolveInitialAdmin(manager, created.id, params, invitedBy);

      return { organization: created, adminOutcome };
    });

    this.emitAdminOutcomeEvents(organization, params, adminOutcome);

    return organization;
  }

  /**
   * Dentro de la transacción de creación: si el email ya pertenece a un
   * usuario, crea su membership ACTIVE + rol ORGANIZATION_ADMIN; si no,
   * genera una invitación por email.
   */
  private async resolveInitialAdmin(
    manager: EntityManager,
    organizationId: string,
    params: CreateOrganizationParams,
    invitedBy?: string,
  ): Promise<AdminOutcome> {
    const existingUser = await manager.findOne(User, { where: { email: params.adminEmail } });

    if (existingUser) {
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
          organizationId,
          userId: existingUser.id,
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

      return { type: 'existing', userId: existingUser.id, userName: existingUser.name };
    }

    const invite = await this.organizationInviteService.createAdminInvite({
      organizationId,
      email: params.adminEmail,
      invitedBy,
      manager,
    });

    return { type: 'invited', token: invite.token };
  }

  /** Efectos post-commit: notificaciones por email y refresco de capacidades. */
  private emitAdminOutcomeEvents(
    organization: Organization,
    params: CreateOrganizationParams,
    adminOutcome: AdminOutcome,
  ): void {
    const baseUrl = this.webAppBaseUrl();

    if (adminOutcome.type === 'existing') {
      this.eventBus.emit('authorization.membership.updated', { userId: adminOutcome.userId });
      this.eventBus.emit('organization.admin.assigned', {
        email: params.adminEmail,
        name: adminOutcome.userName ?? params.adminName ?? '',
        organizationName: organization.name,
        workspaceUrl: `${baseUrl}/org/${organization.id}`,
      });
      return;
    }

    this.eventBus.emit('organization.admin.invited', {
      email: params.adminEmail,
      token: adminOutcome.token,
      organizationName: organization.name,
      inviteUrl: `${baseUrl}/org-invite/${adminOutcome.token}`,
      adminName: params.adminName,
    });
  }

  private webAppBaseUrl(): string {
    return (
      this.configService.get<string>('WEB_APP_DEVELOPMENT') ||
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      ''
    );
  }

  async updateOrganization(
    organizationId: string,
    changes: Partial<Pick<Organization, 'name' | 'type' | 'isActive' | 'ipiNumber'>>,
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
