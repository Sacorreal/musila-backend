import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StaffRole } from './entities/staff-role.entity';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffRolesService } from './staff-roles.service';
import { StaffPermissionsService } from './staff-permissions.service';
import { EventBusService } from 'src/shared/events/event-bus.service';

const makeMockRoleRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((data: Partial<StaffRole>) => data),
  save: jest.fn((data: Partial<StaffRole>) => ({ id: 'role-new', ...data })),
  count: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeMockUserRoleRepo = () => ({
  count: jest.fn(),
});

describe('StaffRolesService', () => {
  let service: StaffRolesService;
  let roleRepo: ReturnType<typeof makeMockRoleRepo>;
  let userRoleRepo: ReturnType<typeof makeMockUserRoleRepo>;
  let permissionsService: { findByIds: jest.Mock };
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    roleRepo = makeMockRoleRepo();
    userRoleRepo = makeMockUserRoleRepo();
    permissionsService = { findByIds: jest.fn() };
    eventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffRolesService,
        { provide: getRepositoryToken(StaffRole), useValue: roleRepo },
        { provide: getRepositoryToken(StaffUserRole), useValue: userRoleRepo },
        { provide: StaffPermissionsService, useValue: permissionsService },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get(StaffRolesService);
  });

  describe('create', () => {
    it('lanza ConflictException si ya existe un rol con ese nombre', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'Editor', permissionIds: ['p1'] }, 'creator-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException al alcanzar el tope de 20 roles personalizados', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.count.mockResolvedValue(20);

      await expect(
        service.create({ name: 'Nuevo rol', permissionIds: ['p1'] }, 'creator-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si algún permiso seleccionado no existe', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.count.mockResolvedValue(0);
      permissionsService.findByIds.mockResolvedValue([{ id: 'p1' }]);

      await expect(
        service.create({ name: 'Nuevo rol', permissionIds: ['p1', 'p2'] }, 'creator-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el rol con slug único derivado del nombre', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.count.mockResolvedValue(0);
      permissionsService.findByIds.mockResolvedValue([{ id: 'p1' }]);

      const role = await service.create(
        { name: 'Editor Junior', permissionIds: ['p1'] },
        'creator-1',
      );

      expect(role).toMatchObject({ name: 'Editor Junior', slug: 'editor-junior', isSystem: false });
    });
  });

  describe('remove', () => {
    it('lanza ConflictException si el rol es del sistema', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', isSystem: true });

      await expect(service.remove('r1')).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si el rol tiene miembros asignados', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', isSystem: false });
      userRoleRepo.count.mockResolvedValue(3);

      await expect(service.remove('r1')).rejects.toThrow(ConflictException);
    });

    it('elimina el rol y emite staff-role.deleted cuando no tiene miembros', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'r1', isSystem: false });
      userRoleRepo.count.mockResolvedValue(0);

      await service.remove('r1');

      expect(roleRepo.remove).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith('staff-role.deleted', { staffRoleId: 'r1' });
    });
  });
});
