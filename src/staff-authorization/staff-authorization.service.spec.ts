import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffAuthorizationService } from './staff-authorization.service';
import { StaffPermissionCacheService } from './cache/staff-permission-cache.service';

const makeMockStaffUserRoleRepo = () => ({
  findOne: jest.fn(),
});

describe('StaffAuthorizationService', () => {
  let service: StaffAuthorizationService;
  let repo: ReturnType<typeof makeMockStaffUserRoleRepo>;
  let cache: StaffPermissionCacheService;

  beforeEach(async () => {
    repo = makeMockStaffUserRoleRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffAuthorizationService,
        StaffPermissionCacheService,
        { provide: getRepositoryToken(StaffUserRole), useValue: repo },
      ],
    }).compile();

    service = module.get(StaffAuthorizationService);
    cache = module.get(StaffPermissionCacheService);
  });

  it('resuelve los permisos desde BD en un cache miss y los cachea', async () => {
    repo.findOne.mockResolvedValue({
      staffRoleId: 'role-1',
      staffRole: { name: 'Editor', permissions: [{ code: 'blog:articles:publish' }] },
    });

    const result = await service.getUserPermissions('user-1');

    expect(result?.permissions.has('blog:articles:publish')).toBe(true);
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  it('en un segundo llamado usa la caché en vez de volver a consultar la BD', async () => {
    repo.findOne.mockResolvedValue({
      staffRoleId: 'role-1',
      staffRole: { name: 'Editor', permissions: [{ code: 'blog:articles:publish' }] },
    });

    await service.getUserPermissions('user-1');
    await service.getUserPermissions('user-1');

    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });

  it('devuelve undefined si el usuario no tiene rol interno asignado', async () => {
    repo.findOne.mockResolvedValue(null);
    const result = await service.getUserPermissions('user-2');
    expect(result).toBeUndefined();
  });

  it('hasPermission es true si alguno de los códigos requeridos está entre los permisos (OR)', async () => {
    repo.findOne.mockResolvedValue({
      staffRoleId: 'role-1',
      staffRole: { name: 'Soporte', permissions: [{ code: 'support:chats:respond' }] },
    });

    await expect(
      service.hasPermission('user-1', ['system:roles:manage', 'support:chats:respond']),
    ).resolves.toBe(true);
  });

  it('invalidar la caché de un usuario fuerza una nueva consulta a BD', async () => {
    repo.findOne.mockResolvedValue({
      staffRoleId: 'role-1',
      staffRole: { name: 'Editor', permissions: [{ code: 'blog:articles:publish' }] },
    });

    await service.getUserPermissions('user-1');
    cache.invalidateUser('user-1');
    await service.getUserPermissions('user-1');

    expect(repo.findOne).toHaveBeenCalledTimes(2);
  });
});
