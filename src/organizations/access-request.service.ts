import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { Role } from 'src/authorization/entities/role.entity';
import { RoleService } from 'src/authorization/role.service';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, Repository } from 'typeorm';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestStatus } from './entities/access-request-status.enum';
import { MembershipStatus } from './entities/membership-status.enum';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { OrganizationsService } from './organizations.service';

/** Resumen amigable de una función que el rol habilita, para notificar al usuario. */
export interface CapabilitySummary {
  name: string;
  description: string;
}

/**
 * Resolución de las solicitudes de acceso al workspace: consulta, aprobación
 * (alta de membership ACTIVE + rol) y rechazo. La aprobación reutiliza la
 * validación anti-escalamiento de `RoleService` y deja todo en una única
 * transacción para no crear memberships huérfanas.
 */
@Injectable()
export class AccessRequestService {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepository: Repository<AccessRequest>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PlanCapability)
    private readonly planCapabilityRepository: Repository<PlanCapability>,
    private readonly organizationsService: OrganizationsService,
    private readonly roleService: RoleService,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  /** Solicitudes de la organización, opcionalmente filtradas por estado. */
  findByOrganization(
    organizationId: string,
    status?: AccessRequestStatus,
  ): Promise<AccessRequest[]> {
    return this.accessRequestRepository.find({
      where: { organizationId, ...(status ? { status } : {}) },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(organizationId: string, requestId: string): Promise<AccessRequest> {
    const request = await this.accessRequestRepository.findOne({
      where: { id: requestId, organizationId },
      relations: { user: true },
    });
    if (!request) throw new NotFoundException('Solicitud de acceso no encontrada');
    return request;
  }

  /**
   * Aprueba la solicitud: crea (o reactiva) la membership ACTIVE del tipo
   * elegido, le asigna el rol y marca la solicitud como aprobada. Notifica al
   * usuario con el rol y el resumen de funciones.
   */
  async approve(
    organizationId: string,
    requestId: string,
    dto: ApproveAccessRequestDto,
    actorUserId: string,
  ): Promise<AccessRequest> {
    const request = await this.findOne(organizationId, requestId);
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    const organization = await this.organizationsService.findById(organizationId);
    // Valida existencia y visibilidad del rol en la organización; carga sus capabilities.
    const role = await this.roleService.getRoleForOrganization(organization, dto.roleId);

    await this.dataSource.transaction(async (manager) => {
      const repository =
        dto.membershipType === MembershipType.ORGANIZATION
          ? manager.getRepository(OrganizationMembership)
          : manager.getRepository(RosterMembership);

      const existing = await repository.findOne({
        where: { organizationId, userId: request.userId },
      });
      if (
        existing &&
        existing.status !== MembershipStatus.REMOVED &&
        existing.status !== MembershipStatus.INVITED &&
        existing.status !== MembershipStatus.PENDING
      ) {
        throw new BadRequestException('El usuario ya tiene una membership en esta organización');
      }

      const membership = existing ?? repository.create({ organizationId, userId: request.userId });
      membership.status = MembershipStatus.ACTIVE;
      membership.invitedBy = actorUserId;
      membership.joinedAt = new Date();
      const savedMembership = await repository.save(membership);

      await this.roleService.validateAndReplaceMembershipRoles(
        manager,
        organization,
        dto.membershipType,
        savedMembership.id,
        [dto.roleId],
        actorUserId,
      );

      request.status = AccessRequestStatus.APPROVED;
      request.decidedBy = actorUserId;
      request.decidedAt = new Date();
      request.resultingMembershipId = savedMembership.id;
      await manager.save(request);
    });

    const capabilities = await this.buildFriendlySummary(organization.id, role);

    this.eventBus.emit('authorization.membership.updated', { userId: request.userId });
    this.eventBus.emit('organization.access_request.approved', {
      userId: request.userId,
      email: request.user.email,
      recipientName: request.user.name,
      organizationId,
      organizationName: organization.name,
      membershipType: dto.membershipType,
      roleId: role.id,
      roleName: role.name,
      capabilities,
    });

    return this.findOne(organizationId, requestId);
  }

  /** Rechaza la solicitud registrando el motivo. */
  async reject(
    organizationId: string,
    requestId: string,
    reason: string | undefined,
    actorUserId: string,
  ): Promise<AccessRequest> {
    const request = await this.findOne(organizationId, requestId);
    if (request.status !== AccessRequestStatus.PENDING) {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    request.status = AccessRequestStatus.REJECTED;
    request.decidedBy = actorUserId;
    request.decidedAt = new Date();
    request.rejectionReason = reason;
    await this.accessRequestRepository.save(request);

    this.eventBus.emit('organization.access_request.rejected', {
      userId: request.userId,
      organizationId,
    });

    return this.findOne(organizationId, requestId);
  }

  /**
   * Construye el resumen legible de funciones (feature 8): las capabilities del
   * rol, con sus nombres y descripciones amigables, intersectadas con las que el
   * plan de la organización habilita. Si la org no tiene subscription activa o la
   * intersección es vacía, devuelve las del rol tal cual.
   */
  async buildFriendlySummary(organizationId: string, role: Role): Promise<CapabilitySummary[]> {
    const roleCapabilities = (role.roleCapabilities ?? [])
      .map((roleCapability) => roleCapability.capability)
      .filter((capability): capability is NonNullable<typeof capability> => Boolean(capability));

    const toSummary = (capabilities: typeof roleCapabilities): CapabilitySummary[] =>
      capabilities.map((capability) => ({
        name: capability.name,
        description: capability.description,
      }));

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        subjectType: SubjectType.ORGANIZATION,
        subjectId: organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!subscription) return toSummary(roleCapabilities);

    const planCapabilities = await this.planCapabilityRepository.find({
      where: { planId: subscription.planId },
    });
    const planKeys = new Set(planCapabilities.map((pc) => pc.capability.key));

    const withinPlan = roleCapabilities.filter((capability) => planKeys.has(capability.key));
    return toSummary(withinPlan.length > 0 ? withinPlan : roleCapabilities);
  }
}
