import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StaffPermission } from './entities/staff-permission.entity';

@Injectable()
export class StaffPermissionsService {
  constructor(
    @InjectRepository(StaffPermission)
    private readonly repository: Repository<StaffPermission>,
  ) {}

  /** Catálogo completo, agrupado por módulo. Es de solo lectura: los permisos se siembran por migración. */
  async findAllGroupedByModule(): Promise<Record<string, StaffPermission[]>> {
    const permissions = await this.repository.find({ order: { module: 'ASC', code: 'ASC' } });

    return permissions.reduce<Record<string, StaffPermission[]>>((groups, permission) => {
      (groups[permission.module] ??= []).push(permission);
      return groups;
    }, {});
  }

  async findAll(): Promise<StaffPermission[]> {
    return this.repository.find({ order: { module: 'ASC', code: 'ASC' } });
  }

  async findByIds(ids: string[]): Promise<StaffPermission[]> {
    if (ids.length === 0) return [];
    return this.repository.find({ where: { id: In(ids) } });
  }
}
