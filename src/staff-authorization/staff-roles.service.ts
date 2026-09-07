import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffRole } from './entities/staff-role.entity';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { CreateStaffRoleDto } from './dto/create-staff-role.dto';
import { UpdateStaffRoleDto } from './dto/update-staff-role.dto';
import { StaffRolePaginationDto } from './dto/staff-role-pagination.dto';
import { StaffPermissionsService } from './staff-permissions.service';
import { EventBusService } from 'src/shared/events/event-bus.service';

const MAX_CUSTOM_ROLES = 20;

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class StaffRolesService {
  constructor(
    @InjectRepository(StaffRole)
    private readonly staffRoleRepository: Repository<StaffRole>,
    @InjectRepository(StaffUserRole)
    private readonly staffUserRoleRepository: Repository<StaffUserRole>,
    private readonly staffPermissionsService: StaffPermissionsService,
    private readonly eventBus: EventBusService,
  ) {}

  async findAll(pagination: StaffRolePaginationDto) {
    const { limit = 10, offset = 0, search } = pagination;
    const qb = this.staffRoleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .orderBy('role.isSystem', 'DESC')
      .addOrderBy('role.name', 'ASC')
      .take(limit)
      .skip(offset);

    if (search) qb.andWhere('role.name ILIKE :search', { search: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  async findOne(id: string): Promise<StaffRole> {
    const role = await this.staffRoleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('El rol interno no existe');
    return role;
  }

  async create(dto: CreateStaffRoleDto, createdBy: string): Promise<StaffRole> {
    const existingByName = await this.staffRoleRepository.findOne({ where: { name: dto.name } });
    if (existingByName) throw new ConflictException('Ya existe un rol con ese nombre');

    const customRolesCount = await this.staffRoleRepository.count({ where: { isSystem: false } });
    if (customRolesCount >= MAX_CUSTOM_ROLES) {
      throw new ConflictException(
        `Se alcanzó el límite de ${MAX_CUSTOM_ROLES} roles personalizados. Elimina uno existente antes de crear otro.`,
      );
    }

    const permissions = await this.staffPermissionsService.findByIds(dto.permissionIds);
    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundException('Uno o más permisos seleccionados no existen');
    }

    const role = this.staffRoleRepository.create({
      name: dto.name,
      slug: await this.uniqueSlug(dto.name),
      description: dto.description,
      isSystem: false,
      createdBy,
      permissions,
    });

    return this.staffRoleRepository.save(role);
  }

  async update(id: string, dto: UpdateStaffRoleDto): Promise<StaffRole> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ConflictException('Los roles base del sistema no se pueden editar');
    }

    if (dto.name && dto.name !== role.name) {
      const existingByName = await this.staffRoleRepository.findOne({ where: { name: dto.name } });
      if (existingByName) throw new ConflictException('Ya existe un rol con ese nombre');
      role.name = dto.name;
      role.slug = await this.uniqueSlug(dto.name);
    }

    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      const permissions = await this.staffPermissionsService.findByIds(dto.permissionIds);
      if (permissions.length !== dto.permissionIds.length) {
        throw new NotFoundException('Uno o más permisos seleccionados no existen');
      }
      role.permissions = permissions;
    }

    const saved = await this.staffRoleRepository.save(role);
    this.eventBus.emit('staff-role.permissions.changed', { staffRoleId: id });
    return saved;
  }

  async remove(id: string): Promise<{ id: string; message: string }> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ConflictException('Los roles base del sistema no se pueden eliminar');
    }

    const membersCount = await this.staffUserRoleRepository.count({ where: { staffRoleId: id } });
    if (membersCount > 0) {
      throw new ConflictException(
        `No se puede eliminar: ${membersCount} miembro(s) del equipo tienen este rol asignado. Reasígnalos primero.`,
      );
    }

    await this.staffRoleRepository.remove(role);
    this.eventBus.emit('staff-role.deleted', { staffRoleId: id });
    return { id, message: 'Rol interno eliminado' };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    let suffix = 1;

    while (await this.staffRoleRepository.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${++suffix}`;
    }

    return candidate;
  }
}
