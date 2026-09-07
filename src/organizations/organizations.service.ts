import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipRole } from 'src/authorization/entities/membership-role.entity';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { Role } from 'src/authorization/entities/role.entity';
import { RoleSource } from 'src/authorization/entities/role-source.enum';
import { Plan } from 'src/entitlements/entities/plan.entity';
import { PlanPrice } from 'src/entitlements/entities/plan-price.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { LegalIdentityService } from 'src/legal-identity/legal-identity.service';
import { BillingPeriod } from 'src/payments/entities/payment.entity';
import {
  OrganizationBillingRequest,
  OrganizationBillingRequestStatus,
} from 'src/payments/entities/organization-billing-request.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { User } from 'src/users/entities/user.entity';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BusinessDocumentType } from './constants/business-document-catalog';
import { MembershipStatus } from './entities/membership-status.enum';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationStatus } from './entities/organization-status.enum';
import { OrganizationType } from './entities/organization-type.enum';
import { Tenant } from './entities/tenant.entity';
import { TenantType } from './entities/tenant-type.enum';
import { Trackspace } from './entities/trackspace.entity';
import { canTransitionOrganization } from './organization-state-machine';
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

/** Datos de `createBusinessForm` (§Registro Legal B2B, paso 1). */
export interface CreateBusinessRegistrationParams {
  legalName: string;
  organizationType: OrganizationType;
  legalCountry: string;
  documentType: BusinessDocumentType;
  documentNumber: string;
  phoneCountryCode: string;
  phoneNumber: string;
  planKey: string;
  registeredByUserId: string;
  adminEmail: string;
}

/** Clave del rol SYSTEM de administrador de organización (superadmin B2B). */
const ORGANIZATION_ADMIN_ROLE_KEY = 'ORGANIZATION_ADMIN';

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
    private readonly legalIdentityService: LegalIdentityService,
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

  async findAll(status?: OrganizationStatus): Promise<Organization[]> {
    return this.organizationRepository.find({
      where: status ? { status } : {},
      relations: { tenant: true },
      order: { createdAt: 'DESC' },
    });
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
      await this.grantOrganizationAdmin(manager, organizationId, existingUser.id, invitedBy);
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

  /**
   * Crea la membership ACTIVE + rol ORGANIZATION_ADMIN de `userId` en
   * `organizationId`. Compartido entre el alta manual del admin de Musila
   * (`createOrganization`) y la activación del primer perfil tras el
   * registro público (`activateOrganizationAdmin`).
   */
  private async grantOrganizationAdmin(
    manager: EntityManager,
    organizationId: string,
    userId: string,
    assignedBy?: string,
  ): Promise<OrganizationMembership> {
    const adminRole = await manager.findOne(Role, {
      where: { key: ORGANIZATION_ADMIN_ROLE_KEY, source: RoleSource.SYSTEM },
    });
    if (!adminRole) {
      throw new BadRequestException(
        `No existe el rol SYSTEM ${ORGANIZATION_ADMIN_ROLE_KEY}; ejecuta los seeds de autorización`,
      );
    }

    const membership = await manager.save(
      manager.create(OrganizationMembership, {
        organizationId,
        userId,
        status: MembershipStatus.ACTIVE,
        invitedBy: assignedBy,
        joinedAt: new Date(),
      }),
    );

    await manager.save(
      manager.create(MembershipRole, {
        membershipType: MembershipType.ORGANIZATION,
        membershipId: membership.id,
        roleId: adminRole.id,
        assignedBy,
      }),
    );

    return membership;
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

  // ─── Registro Legal B2B (onboarding comercial) ─────────────────────────────

  /**
   * `createBusinessForm` (§Registro Legal B2B, paso 1): crea tenant +
   * organización (EN_TRAMITE) + trackspace default. El `User` del futuro
   * Organization Admin ya fue creado por `AuthService.registerBusinessAccount`
   * antes de llamar aquí (mismo criterio que `registerOrgAdminFromInvite`: la
   * creación del usuario y su vínculo con la organización no comparten una
   * única transacción de base de datos entre módulos).
   */
  async createOrganizationForBusinessRegistration(
    params: CreateBusinessRegistrationParams,
  ): Promise<Organization> {
    const plan = await this.dataSource.getRepository(Plan).findOne({
      where: { key: params.planKey, subjectType: SubjectType.ORGANIZATION },
    });
    if (!plan) {
      throw new BadRequestException(`El plan '${params.planKey}' no existe`);
    }

    const slug = await this.generateUniqueSlug(params.legalName);

    const organization = await this.dataSource.transaction(async (manager) => {
      const tenant = await manager.save(
        manager.create(Tenant, { type: TenantType.ORGANIZATION, slug, name: params.legalName }),
      );

      const created = await manager.save(
        manager.create(Organization, {
          tenantId: tenant.id,
          name: params.legalName,
          slug,
          type: params.organizationType,
          status: OrganizationStatus.EN_TRAMITE,
          legalCountry: params.legalCountry,
          documentType: params.documentType,
          documentNumber: params.documentNumber,
          phoneCountryCode: params.phoneCountryCode,
          phoneNumber: params.phoneNumber,
          registeredByUserId: params.registeredByUserId,
          planId: plan.id,
        }),
      );

      await manager.save(
        manager.create(Trackspace, {
          organizationId: created.id,
          name: params.legalName,
          isDefault: true,
        }),
      );

      return created;
    });

    this.eventBus.emit('organization.registration.submitted', {
      organizationId: organization.id,
      organizationName: organization.name,
      adminEmail: params.adminEmail,
      planKey: params.planKey,
    });

    return organization;
  }

  /**
   * Único punto que muta `Organization.status`. Valida la transición contra
   * `organization-state-machine` — fuente única de verdad.
   */
  async transitionStatus(organizationId: string, to: OrganizationStatus): Promise<Organization> {
    const organization = await this.findById(organizationId);
    if (!canTransitionOrganization(organization.status, to)) {
      throw new BadRequestException(`No se puede pasar del estado ${organization.status} a ${to}`);
    }
    organization.status = to;
    return this.organizationRepository.save(organization);
  }

  /**
   * Aprueba una solicitud EN_TRAMITE: genera la solicitud de cobro
   * (`OrganizationBillingRequest`) con el precio vigente del plan, si existe
   * (§3). Si el plan no tiene precio configurado, queda sin `paymentLinkUrl`
   * a la espera de `markOrganizationCreatedManually` (§4).
   */
  async approveBusinessRegistration(organizationId: string): Promise<Organization> {
    const organization = await this.findById(organizationId);
    if (!organization.planId) {
      throw new BadRequestException('La organización no tiene un plan asociado');
    }

    const plan = await this.dataSource.getRepository(Plan).findOne({ where: { id: organization.planId } });
    if (!plan) {
      throw new NotFoundException('El plan solicitado ya no existe');
    }

    const updated = await this.transitionStatus(organizationId, OrganizationStatus.APROBADA);

    const activePrice = await this.resolveActivePlanPrice(plan.id);
    const externalReference = `org-billing-${organizationId}-${randomUUID()}`;
    const paymentLinkUrl = activePrice
      ? `${this.webAppBaseUrl()}/business/pay?ref=${externalReference}`
      : undefined;

    await this.dataSource.getRepository(OrganizationBillingRequest).save({
      organizationId,
      planId: plan.id,
      externalReference,
      paymentLinkUrl,
      amountInCents: activePrice?.amountInCents ?? null,
      currency: activePrice?.currency ?? 'COP',
      status: OrganizationBillingRequestStatus.PENDING,
    });

    const adminEmail = await this.resolveRegistrantEmail(updated);
    this.eventBus.emit('organization.registration.approved', {
      organizationId,
      organizationName: updated.name,
      adminEmail,
      planKey: plan.key,
      planName: plan.name,
      paymentLinkUrl,
    });

    return updated;
  }

  /** Rechaza una solicitud EN_TRAMITE o APROBADA, con motivo (§3). */
  async rejectBusinessRegistration(organizationId: string, reason: string): Promise<Organization> {
    const updated = await this.transitionStatus(organizationId, OrganizationStatus.RECHAZADA);
    updated.rejectionReason = reason;
    const saved = await this.organizationRepository.save(updated);

    const adminEmail = await this.resolveRegistrantEmail(saved);
    this.eventBus.emit('organization.registration.rejected', {
      organizationId,
      organizationName: saved.name,
      adminEmail,
      reason,
    });

    return saved;
  }

  /**
   * Flujo manual (§4, NOTA): para planes sin precio configurado (custom o
   * free), el admin de Musila valida el pago/factura fuera de banda y marca
   * la organización como CREADA.
   */
  async markOrganizationCreatedManually(organizationId: string): Promise<Organization> {
    const billingRepo = this.dataSource.getRepository(OrganizationBillingRequest);
    const billingRequest = await billingRepo.findOne({
      where: { organizationId, status: OrganizationBillingRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
    if (!billingRequest) {
      throw new BadRequestException('No hay una solicitud de pago pendiente para esta organización');
    }
    if (billingRequest.amountInCents != null) {
      throw new BadRequestException(
        'Esta organización tiene un plan con precio configurado; el pago debe confirmarse automáticamente por webhook',
      );
    }

    billingRequest.status = OrganizationBillingRequestStatus.MANUAL_CONFIRMED;
    await billingRepo.save(billingRequest);

    return this.markOrganizationCreatedFromPayment(organizationId);
  }

  /**
   * APROBADA → CREADA (§5). Llamado por el flujo manual anterior o por el
   * listener de pagos (`payments/organization-billing.service.ts`) tras
   * confirmar el webhook de Wompi.
   */
  async markOrganizationCreatedFromPayment(organizationId: string): Promise<Organization> {
    const updated = await this.transitionStatus(organizationId, OrganizationStatus.CREADA);

    const adminEmail = await this.resolveRegistrantEmail(updated);
    this.eventBus.emit('organization.registration.created', {
      organizationId,
      organizationName: updated.name,
      adminEmail,
    });

    return updated;
  }

  /**
   * Primer perfil de la organización (§5): quien envió `createBusinessForm`
   * se activa como Organization Admin una vez CREADA. Idempotente.
   */
  async activateOrganizationAdmin(organizationId: string, userId: string): Promise<Organization> {
    const organization = await this.findById(organizationId);

    if (organization.registeredByUserId !== userId) {
      throw new BadRequestException(
        'Solo quien registró la organización puede activar el perfil de administrador',
      );
    }
    if (
      organization.status !== OrganizationStatus.CREADA &&
      organization.status !== OrganizationStatus.VERIFICADA
    ) {
      throw new BadRequestException('La organización aún no está lista para activar el perfil de administrador');
    }

    const existingMembership = await this.dataSource.getRepository(OrganizationMembership).findOne({
      where: { organizationId, userId, status: MembershipStatus.ACTIVE },
    });
    if (existingMembership) {
      return organization;
    }

    await this.dataSource.transaction((manager) =>
      this.grantOrganizationAdmin(manager, organizationId, userId, userId),
    );

    this.eventBus.emit('authorization.membership.updated', { userId });

    return organization;
  }

  /**
   * CREADA → VERIFICADA (§7): idempotente, pensado para ser llamado tras
   * cada paso del onboarding (pago, activación de perfil, identidad legal).
   * Arranca la `Subscription` de la organización al verificar (§8).
   */
  async checkAndVerifyOrganization(organizationId: string): Promise<Organization> {
    const organization = await this.findById(organizationId);
    if (organization.status !== OrganizationStatus.CREADA) {
      return organization;
    }

    if (!(await this.hasVerifiedLegalRepresentative(organizationId))) {
      return organization;
    }

    const verifiedAt = new Date();
    organization.status = OrganizationStatus.VERIFICADA;
    organization.verifiedAt = verifiedAt;
    const saved = await this.organizationRepository.save(organization);

    await this.startSubscription(saved, verifiedAt);

    const plan = saved.planId
      ? await this.dataSource.getRepository(Plan).findOne({ where: { id: saved.planId } })
      : null;
    const adminEmail = await this.resolveRegistrantEmail(saved);

    this.eventBus.emit('organization.registration.verified', {
      organizationId,
      organizationName: saved.name,
      adminEmail,
      planKey: plan?.key ?? '',
      planName: plan?.name ?? '',
      subscriptionStartAt: verifiedAt,
    });

    return saved;
  }

  /** ¿Existe al menos un Organization Admin ACTIVE con identidad legal verificada (§6/§7)? */
  private async hasVerifiedLegalRepresentative(organizationId: string): Promise<boolean> {
    const adminMemberships = await this.dataSource.getRepository(OrganizationMembership).find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
    });
    if (!adminMemberships.length) return false;

    const adminRole = await this.dataSource.getRepository(Role).findOne({
      where: { key: ORGANIZATION_ADMIN_ROLE_KEY, source: RoleSource.SYSTEM },
    });
    if (!adminRole) return false;

    const adminAssignments = await this.dataSource.getRepository(MembershipRole).find({
      where: {
        membershipType: MembershipType.ORGANIZATION,
        membershipId: In(adminMemberships.map((m) => m.id)),
        roleId: adminRole.id,
      },
    });
    const adminUserIds = adminMemberships
      .filter((m) => adminAssignments.some((a) => a.membershipId === m.id))
      .map((m) => m.userId);

    for (const userId of adminUserIds) {
      if (await this.legalIdentityService.isVerified(userId)) return true;
    }
    return false;
  }

  /** Arranca la `Subscription` (§8): sin precio configurado = sin vencimiento. */
  private async startSubscription(organization: Organization, startAt: Date): Promise<void> {
    if (!organization.planId) return;

    const activePrice = await this.resolveActivePlanPrice(organization.planId);
    const endAt = activePrice ? this.computeSubscriptionEndAt(startAt, activePrice.billingPeriod) : null;

    await this.dataSource.getRepository(Subscription).save({
      subjectType: SubjectType.ORGANIZATION,
      subjectId: organization.id,
      planId: organization.planId,
      status: SubscriptionStatus.ACTIVE,
      startAt,
      endAt,
      billingProvider: 'wompi',
    });
  }

  private computeSubscriptionEndAt(startAt: Date, billingPeriod: BillingPeriod): Date {
    const endAt = new Date(startAt);
    endAt.setDate(endAt.getDate() + (billingPeriod === BillingPeriod.ANNUAL ? 365 : 30));
    return endAt;
  }

  /** Fila vigente de `PlanPrice`; `null` = "plan sin precio establecido" (§4). */
  private async resolveActivePlanPrice(
    planId: string,
    currency = 'COP',
    billingPeriod: BillingPeriod = BillingPeriod.MONTHLY,
  ): Promise<PlanPrice | null> {
    return this.dataSource
      .getRepository(PlanPrice)
      .findOne({ where: { planId, currency, billingPeriod, isActive: true }, order: { effectiveFrom: 'DESC' } });
  }

  private async resolveRegistrantEmail(organization: Organization): Promise<string> {
    if (!organization.registeredByUserId) return '';
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: organization.registeredByUserId } });
    return user?.email ?? '';
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base =
      name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'organizacion';

    let candidate = base;
    let attempt = 1;
    while (await this.organizationRepository.findOne({ where: { slug: candidate } })) {
      attempt += 1;
      candidate = `${base}-${attempt}`;
    }
    return candidate;
  }
}
