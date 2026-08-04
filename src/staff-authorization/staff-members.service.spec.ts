import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffRole } from './entities/staff-role.entity';
import { StaffMembersService } from './staff-members.service';
import { StaffAuthorizationService } from './staff-authorization.service';
import { UsersService } from 'src/users/users.service';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';

const makeMockUserRoleRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((data: Partial<StaffUserRole>) => data),
  save: jest.fn((data: Partial<StaffUserRole>) => ({ id: 'assignment-1', ...data })),
  remove: jest.fn(),
});

const makeMockRoleRepo = () => ({
  findOne: jest.fn(),
});

describe('StaffMembersService', () => {
  let service: StaffMembersService;
  let userRoleRepo: ReturnType<typeof makeMockUserRoleRepo>;
  let roleRepo: ReturnType<typeof makeMockRoleRepo>;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    userRoleRepo = makeMockUserRoleRepo();
    roleRepo = makeMockRoleRepo();
    usersService = {
      findUserByEmailService: jest.fn(),
      findOneUserByIdService: jest.fn(),
      createUserService: jest.fn(),
      saveResetToken: jest.fn(),
      updateUserService: jest.fn(),
    };
    eventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffMembersService,
        { provide: getRepositoryToken(StaffUserRole), useValue: userRoleRepo },
        { provide: getRepositoryToken(StaffRole), useValue: roleRepo },
        { provide: UsersService, useValue: usersService },
        { provide: EventBusService, useValue: eventBus },
        { provide: StaffAuthorizationService, useValue: { getUserPermissions: jest.fn() } },
      ],
    }).compile();

    service = module.get(StaffMembersService);
  });

  describe('invite', () => {
    it('lanza ConflictException si el email ya está registrado', async () => {
      (usersService.findUserByEmailService as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.invite(
          { name: 'A', lastName: 'B', email: 'a@musila.co', staffRoleId: 'role-1' },
          'inviter-1',
          UserPlanType.ADMIN,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si el rol interno no existe', async () => {
      (usersService.findUserByEmailService as jest.Mock).mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.invite(
          { name: 'A', lastName: 'B', email: 'a@musila.co', staffRoleId: 'role-1' },
          'inviter-1',
          UserPlanType.ADMIN,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si un Admin (no Super Admin) invita con el rol Super Admin', async () => {
      (usersService.findUserByEmailService as jest.Mock).mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue({ id: 'role-1', slug: 'super-admin' });

      await expect(
        service.invite(
          { name: 'A', lastName: 'B', email: 'a@musila.co', staffRoleId: 'role-1' },
          'inviter-1',
          UserPlanType.ADMIN,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('crea el usuario, dispara el reset de contraseña y asigna el rol', async () => {
      (usersService.findUserByEmailService as jest.Mock).mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue({ id: 'role-1', slug: 'editor' });
      (usersService.createUserService as jest.Mock).mockResolvedValue({
        id: 'user-new',
        email: 'a@musila.co',
        name: 'A',
      });

      const result = await service.invite(
        { name: 'A', lastName: 'B', email: 'a@musila.co', staffRoleId: 'role-1' },
        'inviter-1',
        UserPlanType.SUPERADMIN,
      );

      expect(usersService.saveResetToken).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        'user.password.reset.requested',
        expect.objectContaining({ email: 'a@musila.co' }),
      );
      expect(result).toMatchObject({ userId: 'user-new', staffRoleId: 'role-1' });
    });
  });

  describe('revokeRole', () => {
    it('lanza NotFoundException si el usuario no tiene rol interno', async () => {
      userRoleRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeRole('user-1', UserPlanType.SUPERADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('revoca el rol, degrada el planType y emite staff-assignment.changed', async () => {
      userRoleRepo.findOne.mockResolvedValue({ id: 'assignment-1', userId: 'user-1' });

      await service.revokeRole('user-1', UserPlanType.SUPERADMIN);

      expect(userRoleRepo.remove).toHaveBeenCalled();
      expect(usersService.updateUserService).toHaveBeenCalledWith(
        'user-1',
        { planType: UserPlanType.INVITADO },
        { planType: UserPlanType.SUPERADMIN },
      );
      expect(eventBus.emit).toHaveBeenCalledWith('staff-assignment.changed', { userId: 'user-1' });
    });
  });
});
