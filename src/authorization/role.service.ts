import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource, In, Repository } from 'typeorm';
import { AuthorizationService } from './authorization.service';
import { CapabilityService } from './capability.service';
import { CapabilityScope } from './entities/capability-scope.enum';
import { CapabilitySubject } from './entities/capability-subject.enum';
import { MembershipRole } from './entities/membership-role.entity';
import { MembershipType } from './entities/membership-type.enum';
import { Role } from './entities/role.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { RoleSource } from './entities/role-source.enum';
import { RoleType } from './entities/role-type.enum';

export interface CreateCustomRoleParams {
  name: string;
  description?: string;
  type: RoleType.ORGANIZATION | RoleType.ROSTER;
  capabilityIds: string[];
  scope?: CapabilityScope;
}

export interface UpdateRoleParams {
  name?: string;
  description?: string;
  isActive?: boolean;
}

const ROLE_TYPE_TO_SUBJECT: Record<RoleType, CapabilitySubject> = {
  [RoleType.PLATFORM]: CapabilitySubject.PLATFORM_MEMBER,
  [RoleType.ORGANIZATION]: CapabilitySubject.ORGANIZATION_MEMBER,
  [RoleType.ROSTER]: CapabilitySubject.ROSTER_MEMBER,
};

const DEFAULT_SCOPE_BY_ROLE_TYPE: Record<RoleType, CapabilityScope> = {
  [RoleType.PLATFORM]: CapabilityScope.PLATFORM,
  [RoleType.ORGANIZATION]: CapabilityScope.ORGANIZATION,
  [RoleType.ROSTER]: CapabilityScope.OWN,
};

/**
 * CRUD de roles tenant-aware y asignación rol↔membership. Reglas §3/§11:
 * los roles SYSTEM no se editan ni eliminan; los CUSTOM quedan aislados en
 * su tenant; toda capability se re-valida en backend antes de persistir.
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RoleCapability)
    private readonly roleCapabilityRepository: Repository<RoleCapability>,
    @InjectRepository(MembershipRole)
    private readonly membershipRoleRepository: Repository<MembershipRole>,
    private readonly capabilityService: CapabilityService,
    private readonly authorizationService: AuthorizationService,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
  ) {}

  /** Roles visibles para una organización: los suyos + los SYSTEM compartidos (plantillas de Musila). */
  async findRolesForOrganization(organization: Organization): Promise<Role[]> {
    const ownRoles = await this.roleRepository.find({
      where: { tenantId: organization.tenantId },
      relations: { roleCapabilities: { capability: true } },
    });

    const sharedSystemRoles = await this.roleRepository.find({
      where: {
        source: RoleSource.SYSTEM,
        type: In([RoleType.ORGANIZATION, RoleType.ROSTER]),
      },
      relations: { roleCapabilities: { capability: true } },
    });

    const byId = new Map<string, Role>();
    for (const role of [...sharedSystemRoles, ...ownRoles]) byId.set(role.id, role);
    return [...byId.values()];
  }

  async getRoleForOrganization(organization: Organization, roleId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: { roleCapabilities: { capability: true } },
    });

    if (!role || !this.isVisibleToOrganization(role, organization)) {
      throw new NotFoundException('Rol no encontrado en esta organización');
    }
    return role;
  }

  async createCustomRole(
    organization: Organization,
    params: CreateCustomRoleParams,
    actorUserId: string,
  ): Promise<Role> {
    const capabilities = await this.capabilityService.findByIds(params.capabilityIds);
    if (capabilities.length !== params.capabilityIds.length) {
      throw new BadRequestException('Alguna de las capabilities indicadas no existe');
    }

    this.capabilityService.assertCompatibleWithRole(
      capabilities,
      ROLE_TYPE_TO_SUBJECT[params.type],
      organization.type,
    );

    await this.assertCanGrant(actorUserId, organization.id, capabilities.map((c) => c.key));

    const scope = params.scope ?? DEFAULT_SCOPE_BY_ROLE_TYPE[params.type];

    const role = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        manager.create(Role, {
          tenantId: organization.tenantId,
          type: params.type,
          source: RoleSource.CUSTOM,
          name: params.name,
          description: params.description,
        }),
      );

      await manager.save(
        capabilities.map((capability) =>
          manager.create(RoleCapability, {
            roleId: created.id,
            capabilityId: capability.id,
            scope,
          }),
        ),
      );

      return created;
    });

    this.emitRoleUpdated(role.id);
    return this.getRoleForOrganization(organization, role.id);
  }

  async updateRole(
    organization: Organization,
    roleId: string,
    changes: UpdateRoleParams,
  ): Promise<Role> {
    const role = await this.getRoleForOrganization(organization, roleId);
    this.assertEditable(role, organization);

    if (changes.name !== undefined) role.name = changes.name;
    if (changes.description !== undefined) role.description = changes.description;
    if (changes.isActive !== undefined) role.isActive = changes.isActive;

    await this.roleRepository.save(role);
    this.emitRoleUpdated(role.id);
    return this.getRoleForOrganization(organization, roleId);
  }

  async deleteRole(organization: Organization, roleId: string): Promise<void> {
    const role = await this.getRoleForOrganization(organization, roleId);
    this.assertEditable(role, organization);

    const assignments = await this.membershipRoleRepository.count({ where: { roleId } });
    if (assignments > 0) {
      throw new BadRequestException(
        'El rol tiene memberships asignadas; retira las asignaciones antes de eliminarlo',
      );
    }

    await this.roleRepository.remove(role);
    this.emitRoleUpdated(roleId);
  }

  /** Reemplaza el set completo de capabilities del rol (PUT .../capabilities). */
  async setRoleCapabilities(
    organization: Organization,
    roleId: string,
    capabilityIds: string[],
    actorUserId: string,
    scope?: CapabilityScope,
  ): Promise<Role> {
    const role = await this.getRoleForOrganization(organization, roleId);
    this.assertEditable(role, organization);

    const capabilities = await this.capabilityService.findByIds(capabilityIds);
    if (capabilities.length !== capabilityIds.length) {
      throw new BadRequestException('Alguna de las capabilities indicadas no existe');
    }

    this.capabilityService.assertCompatibleWithRole(
      capabilities,
      ROLE_TYPE_TO_SUBJECT[role.type],
      organization.type,
    );
    await this.assertCanGrant(actorUserId, organization.id, capabilities.map((c) => c.key));

    const effectiveScope = scope ?? DEFAULT_SCOPE_BY_ROLE_TYPE[role.type];

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(RoleCapability, { roleId });
      await manager.save(
        capabilities.map((capability) =>
          manager.create(RoleCapability, {
            roleId,
            capabilityId: capability.id,
            scope: effectiveScope,
          }),
        ),
      );
    });

    this.emitRoleUpdated(roleId);
    return this.getRoleForOrganization(organization, roleId);
  }

  async addRoleCapability(
    organization: Organization,
    roleId: string,
    capabilityId: string,
    actorUserId: string,
    scope?: CapabilityScope,
  ): Promise<Role> {
    const role = await this.getRoleForOrganization(organization, roleId);
    this.assertEditable(role, organization);

    const capability = await this.capabilityService.getById(capabilityId);
    this.capabilityService.assertCompatibleWithRole(
      [capability],
      ROLE_TYPE_TO_SUBJECT[role.type],
      organization.type,
    );
    await this.assertCanGrant(actorUserId, organization.id, [capability.key]);

    const existing = await this.roleCapabilityRepository.findOne({
      where: { roleId, capabilityId },
    });
    if (!existing) {
      await this.roleCapabilityRepository.save(
        this.roleCapabilityRepository.create({
          roleId,
          capabilityId,
          scope: scope ?? DEFAULT_SCOPE_BY_ROLE_TYPE[role.type],
        }),
      );
      this.emitRoleUpdated(roleId);
    }

    return this.getRoleForOrganization(organization, roleId);
  }

  async removeRoleCapability(
    organization: Organization,
    roleId: string,
    capabilityId: string,
  ): Promise<Role> {
    const role = await this.getRoleForOrganization(organization, roleId);
    this.assertEditable(role, organization);

    await this.roleCapabilityRepository.delete({ roleId, capabilityId });
    this.emitRoleUpdated(roleId);
    return this.getRoleForOrganization(organization, roleId);
  }

  async getMembershipRoles(
    membershipType: MembershipType,
    membershipId: string,
  ): Promise<MembershipRole[]> {
    return this.membershipRoleRepository.find({
      where: { membershipType, membershipId },
    });
  }

  /** Reemplaza los roles de una membership (PUT membership roles). Multi-rol permitido (§3). */
  async setMembershipRoles(
    organization: Organization,
    membershipType: MembershipType,
    membershipId: string,
    roleIds: string[],
    assignedBy: string,
    affectedUserId: string,
  ): Promise<MembershipRole[]> {
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
      relations: { roleCapabilities: { capability: true } },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('Alguno de los roles indicados no existe');
    }

    const expectedRoleType =
      membershipType === MembershipType.ORGANIZATION ? RoleType.ORGANIZATION : RoleType.ROSTER;

    for (const role of roles) {
      if (!this.isVisibleToOrganization(role, organization)) {
        throw new ForbiddenException(`El rol '${role.name}' no pertenece a esta organización`);
      }
      const isPlatformRoleInPlatformTenant =
        role.type === RoleType.PLATFORM && role.tenantId === organization.tenantId;
      if (role.type !== expectedRoleType && !isPlatformRoleInPlatformTenant) {
        throw new BadRequestException(
          `El rol '${role.name}' (${role.type}) no es asignable a una membership ${membershipType}`,
        );
      }
    }

    const grantedKeys = roles.flatMap((role) =>
      (role.roleCapabilities ?? []).map((roleCapability) => roleCapability.capability.key),
    );
    await this.assertCanGrant(assignedBy, organization.id, grantedKeys);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(MembershipRole, { membershipType, membershipId });
      await manager.save(
        roleIds.map((roleId) =>
          manager.create(MembershipRole, { membershipType, membershipId, roleId, assignedBy }),
        ),
      );
    });

    this.eventBus.emit('authorization.membership.updated', { userId: affectedUserId });
    return this.getMembershipRoles(membershipType, membershipId);
  }

  /**
   * Prevención de escalamiento de privilegios (§14): quien otorga no puede
   * conceder capabilities que él mismo no posee en ese contexto.
   */
  private async assertCanGrant(
    actorUserId: string,
    organizationId: string,
    capabilityKeys: string[],
  ): Promise<void> {
    const actorKeys = new Set(
      await this.authorizationService.getEffectiveCapabilityKeys({
        userId: actorUserId,
        organizationId,
      }),
    );
    // El staff de plataforma administra organizaciones sin membership en ellas:
    // sus capabilities efectivas provienen del contexto plataforma.
    const actorPlatformKeys = new Set(
      await this.authorizationService.getEffectiveCapabilityKeys({ userId: actorUserId }),
    );

    const missing = capabilityKeys.filter(
      (key) => !actorKeys.has(key) && !actorPlatformKeys.has('platform.organizations.manage'),
    );

    if (missing.length > 0) {
      throw new ForbiddenException({
        message: `No puedes otorgar capabilities que no posees: ${missing.join(', ')}`,
        code: 'PRIVILEGE_ESCALATION_DENIED',
        capabilities: missing,
      });
    }
  }

  private assertEditable(role: Role, organization: Organization): void {
    if (role.source === RoleSource.SYSTEM) {
      throw new ForbiddenException('Los roles SYSTEM no pueden modificarse ni eliminarse');
    }
    if (role.tenantId !== organization.tenantId) {
      throw new ForbiddenException('El rol pertenece a otro tenant');
    }
  }

  private isVisibleToOrganization(role: Role, organization: Organization): boolean {
    if (role.tenantId === organization.tenantId) return true;
    return (
      role.source === RoleSource.SYSTEM &&
      (role.type === RoleType.ORGANIZATION || role.type === RoleType.ROSTER)
    );
  }

  private emitRoleUpdated(roleId: string): void {
    this.eventBus.emit('authorization.role.updated', { roleId });
  }
}
