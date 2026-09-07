import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffRole } from './entities/staff-role.entity';
import { InviteStaffMemberDto } from './dto/invite-staff-member.dto';
import { AssignStaffRoleDto } from './dto/assign-staff-role.dto';
import { StaffMemberPaginationDto } from './dto/staff-member-pagination.dto';
import { UsersService } from 'src/users/users.service';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { StaffAuthorizationService } from './staff-authorization.service';

const SUPER_ADMIN_SLUG = 'super-admin';
const RESET_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StaffMembersService {
  constructor(
    @InjectRepository(StaffUserRole)
    private readonly staffUserRoleRepository: Repository<StaffUserRole>,
    @InjectRepository(StaffRole)
    private readonly staffRoleRepository: Repository<StaffRole>,
    private readonly usersService: UsersService,
    private readonly eventBus: EventBusService,
    private readonly staffAuthorizationService: StaffAuthorizationService,
  ) {}

  async findAll(pagination: StaffMemberPaginationDto) {
    const { limit = 10, offset = 0, search, staffRoleId } = pagination;
    const qb = this.staffUserRoleRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.staffRole', 'staffRole')
      .orderBy('assignment.assignedAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (staffRoleId) qb.andWhere('assignment.staffRoleId = :staffRoleId', { staffRoleId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  /** Flow 1, caso de error: correo no registrado → invita por email con contraseña temporal. */
  async invite(
    dto: InviteStaffMemberDto,
    invitedBy: string,
    invitedByPlanType: UserPlanType,
  ): Promise<StaffUserRole> {
    const existing = await this.usersService.findUserByEmailService(dto.email);
    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario con ese correo. Usa "asignar rol" en vez de invitar.',
      );
    }

    const staffRole = await this.getRoleOrFail(dto.staffRoleId);
    this.assertCanGrant(staffRole, invitedByPlanType);

    const temporaryPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.usersService.createUserService({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      planType: this.planTypeForRole(staffRole),
      isVerified: true,
    } as any);

    // El invitado define su propia contraseña reutilizando el flujo de "olvidé mi contraseña" ya existente.
    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.saveResetToken(
      user.id,
      resetToken,
      new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS),
    );
    this.eventBus.emit('user.password.reset.requested', {
      email: user.email,
      token: resetToken,
      name: user.name,
    });

    const assignment = this.staffUserRoleRepository.create({
      userId: user.id,
      staffRoleId: staffRole.id,
      assignedBy: invitedBy,
    });

    return this.staffUserRoleRepository.save(assignment);
  }

  /** Flow 1: asignar/cambiar el rol interno de un usuario ya existente. */
  async assignRole(
    userId: string,
    dto: AssignStaffRoleDto,
    assignedBy: string,
    assignedByPlanType: UserPlanType,
  ): Promise<StaffUserRole> {
    await this.usersService.findOneUserByIdService(userId);
    const staffRole = await this.getRoleOrFail(dto.staffRoleId);
    this.assertCanGrant(staffRole, assignedByPlanType);

    let assignment = await this.staffUserRoleRepository.findOne({ where: { userId } });
    if (assignment) {
      assignment.staffRoleId = staffRole.id;
      assignment.assignedBy = assignedBy;
    } else {
      assignment = this.staffUserRoleRepository.create({ userId, staffRoleId: staffRole.id, assignedBy });
    }

    const saved = await this.staffUserRoleRepository.save(assignment);
    await this.usersService.updateUserService(
      userId,
      { planType: this.planTypeForRole(staffRole) } as any,
      { planType: assignedByPlanType },
    );
    this.eventBus.emit('staff-assignment.changed', { userId });

    return saved;
  }

  /** Revoca el rol interno: el usuario deja de ser staff (vuelve a un plan de producto base). */
  async revokeRole(userId: string, revokedByPlanType: UserPlanType): Promise<{ userId: string; message: string }> {
    const assignment = await this.staffUserRoleRepository.findOne({ where: { userId } });
    if (!assignment) throw new NotFoundException('El usuario no tiene un rol interno asignado');

    await this.staffUserRoleRepository.remove(assignment);
    await this.usersService.updateUserService(
      userId,
      { planType: UserPlanType.INVITADO } as any,
      { planType: revokedByPlanType },
    );
    this.eventBus.emit('staff-assignment.changed', { userId });

    return { userId, message: 'Rol interno revocado' };
  }

  async getMyPermissions(userId: string) {
    const permissions = await this.staffAuthorizationService.getUserPermissions(userId);
    if (!permissions) {
      return { staffRoleId: null, roleName: null, permissions: [] };
    }
    return {
      staffRoleId: permissions.staffRoleId,
      roleName: permissions.roleName,
      permissions: Array.from(permissions.permissions),
    };
  }

  private async getRoleOrFail(staffRoleId: string): Promise<StaffRole> {
    const role = await this.staffRoleRepository.findOne({ where: { id: staffRoleId } });
    if (!role) throw new NotFoundException('El rol interno seleccionado no existe');
    return role;
  }

  /** Solo un Super Admin puede otorgar el propio rol de Super Admin (mismo principio que ya aplica `updateUserService`). */
  private assertCanGrant(staffRole: StaffRole, actingUserPlanType: UserPlanType): void {
    if (staffRole.slug === SUPER_ADMIN_SLUG && actingUserPlanType !== UserPlanType.SUPERADMIN) {
      throw new ForbiddenException('Solo un Super Admin puede asignar el rol de Super Admin');
    }
  }

  /** Sincroniza con el enum legado (ver decisión 0.2 del plan): Super Admin → SUPERADMIN, cualquier otro rol → ADMIN. */
  private planTypeForRole(staffRole: StaffRole): UserPlanType {
    return staffRole.slug === SUPER_ADMIN_SLUG ? UserPlanType.SUPERADMIN : UserPlanType.ADMIN;
  }
}
