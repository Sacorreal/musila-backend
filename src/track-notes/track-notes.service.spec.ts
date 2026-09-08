import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { CollaboratorPermission } from 'src/playlist-collaborators/entities/collaborator-permission.enum';
import { TrackNotesService } from './track-notes.service';

const buildUser = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'User One',
  planType: UserPlanType.PLAN_DESCUBRIDOR,
  ...overrides,
});

describe('TrackNotesService', () => {
  let service: TrackNotesService;
  let trackNoteRepo: any;
  let trackRepo: any;
  let playlistRepo: any;
  let playlistCollaboratorsService: any;
  let sharingService: any;
  let authorizationService: any;

  beforeEach(() => {
    trackNoteRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'note-1', ...data })),
      find: jest.fn(),
      // Usado por `create` (recarga tras save) y por `update`/`remove` (carga
      // previa) — default representa una nota privada de `user-1` ya cargada
      // con las relaciones necesarias para `toResponseDto`.
      findOne: jest.fn().mockResolvedValue({
        id: 'note-1',
        track: { id: 'track-1' },
        playlist: null,
        authorUser: { id: 'user-1', name: 'User', lastName: 'One' },
        authorGuest: null,
        content: 'nota',
        timestampSeconds: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      }),
      softRemove: jest.fn().mockResolvedValue(undefined),
    };
    trackRepo = {
      exists: jest.fn().mockResolvedValue(true),
    };
    playlistRepo = {
      findOne: jest.fn(),
    };
    playlistCollaboratorsService = {
      getCollaboratorPermission: jest.fn().mockResolvedValue(null),
    };
    sharingService = {
      hasActivePlaylistAccess: jest.fn().mockResolvedValue(false),
    };
    authorizationService = {
      check: jest.fn().mockResolvedValue({ allowed: false }),
      getEffectiveCapabilityKeys: jest.fn().mockResolvedValue([]),
    };

    service = new TrackNotesService(
      trackNoteRepo,
      trackRepo,
      playlistRepo,
      playlistCollaboratorsService,
      sharingService,
      authorizationService,
    );
  });

  describe('create sin playlistId (nota privada)', () => {
    it('lanza ForbiddenException si el usuario no tiene marketplace.search', async () => {
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue(['other.cap']);

      await expect(
        service.create({ trackId: 'track-1', content: 'nota' }, buildUser()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza NotFoundException si el track no existe', async () => {
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue(['marketplace.search']);
      trackRepo.exists.mockResolvedValue(false);

      await expect(
        service.create({ trackId: 'track-1', content: 'nota' }, buildUser()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crea la nota con authorUser cuando el autor es un User', async () => {
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue(['marketplace.search']);

      const result = await service.create(
        { trackId: 'track-1', content: 'nota privada' },
        buildUser({ id: 'user-1', planType: UserPlanType.PLAN_DESCUBRIDOR }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          authorUser: { id: 'user-1' },
          authorGuest: null,
          playlist: null,
          content: 'nota privada',
        }),
      );
      expect(result.id).toBe('note-1');
    });

    it('crea la nota con authorGuest cuando el autor es un Guest (INVITADO)', async () => {
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue(['marketplace.search']);

      await service.create(
        { trackId: 'track-1', content: 'nota de invitado' },
        buildUser({ id: 'guest-1', planType: UserPlanType.INVITADO }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ authorUser: null, authorGuest: { id: 'guest-1' } }),
      );
    });
  });

  describe('create con playlistId (nota de playlist compartida)', () => {
    const playlistId = 'playlist-1';
    const trackId = 'track-1';

    const mockPlaylist = (overrides: Partial<{ ownerId: string; tracks: { id: string }[] }> = {}) => ({
      id: playlistId,
      owner: { id: overrides.ownerId ?? 'owner-1' },
      tracks: overrides.tracks ?? [{ id: trackId }],
    });

    it('lanza NotFoundException si la playlist no existe', async () => {
      playlistRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ trackId, playlistId, content: 'nota' }, buildUser()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('permite al dueño de la playlist sin exigir ninguna capability', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'user-1' }));

      await service.create({ trackId, playlistId, content: 'nota' }, buildUser({ id: 'user-1' }));

      expect(authorizationService.getEffectiveCapabilityKeys).not.toHaveBeenCalled();
      expect(trackNoteRepo.save).toHaveBeenCalled();
    });

    it('permite a un colaborador con cualquier nivel de permiso (READ/WRITE/ADMIN)', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'owner-1' }));
      playlistCollaboratorsService.getCollaboratorPermission.mockResolvedValue(
        CollaboratorPermission.READ,
      );

      await service.create(
        { trackId, playlistId, content: 'nota' },
        buildUser({ id: 'collaborator-1' }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalled();
    });

    it('permite a un destinatario de share-link con acceso activo', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'owner-1' }));
      sharingService.hasActivePlaylistAccess.mockResolvedValue(true);

      await service.create(
        { trackId, playlistId, content: 'nota' },
        buildUser({ id: 'recipient-1' }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalled();
    });

    it('lanza ForbiddenException si no es dueño, ni colaborador, ni tiene share-link activo', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'owner-1' }));

      await expect(
        service.create({ trackId, playlistId, content: 'nota' }, buildUser({ id: 'stranger-1' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite a un User colaborador que no tiene marketplace.search (no exige la capability)', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'owner-1' }));
      playlistCollaboratorsService.getCollaboratorPermission.mockResolvedValue(
        CollaboratorPermission.WRITE,
      );
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue([]);

      await service.create(
        { trackId, playlistId, content: 'nota' },
        buildUser({ id: 'collaborator-user-1', planType: UserPlanType.PLAN_AUTOR }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalled();
    });

    it('lanza BadRequestException si el track no pertenece a la playlist', async () => {
      playlistRepo.findOne.mockResolvedValue(
        mockPlaylist({ ownerId: 'user-1', tracks: [{ id: 'other-track' }] }),
      );

      await expect(
        service.create({ trackId, playlistId, content: 'nota' }, buildUser({ id: 'user-1' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('staff con platform.playlists.moderate tiene acceso total', async () => {
      playlistRepo.findOne.mockResolvedValue(mockPlaylist({ ownerId: 'owner-1' }));
      authorizationService.check.mockResolvedValue({ allowed: true });

      await service.create(
        { trackId, playlistId, content: 'nota' },
        buildUser({ id: 'staff-1' }),
      );

      expect(trackNoteRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllByTrack', () => {
    it('sin playlistId retorna solo las notas privadas del usuario autenticado', async () => {
      authorizationService.getEffectiveCapabilityKeys.mockResolvedValue(['marketplace.search']);
      trackNoteRepo.find.mockResolvedValue([]);

      await service.findAllByTrack('track-1', undefined, buildUser({ id: 'user-1' }));

      expect(trackNoteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            expect.objectContaining({ authorUser: { id: 'user-1' } }),
            expect.objectContaining({ authorGuest: { id: 'user-1' } }),
          ],
        }),
      );
    });

    it('con playlistId retorna todas las notas de la playlist (requiere membresía)', async () => {
      playlistRepo.findOne.mockResolvedValue({
        id: 'playlist-1',
        owner: { id: 'user-1' },
        tracks: [{ id: 'track-1' }],
      });
      trackNoteRepo.find.mockResolvedValue([]);

      await service.findAllByTrack('track-1', 'playlist-1', buildUser({ id: 'user-1' }));

      expect(trackNoteRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { track: { id: 'track-1' }, playlist: { id: 'playlist-1' } },
        }),
      );
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la nota no existe', async () => {
      trackNoteRepo.findOne.mockResolvedValue(null);

      await expect(service.update('note-1', { content: 'x' }, buildUser())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si el usuario no es el autor', async () => {
      trackNoteRepo.findOne.mockResolvedValue({
        id: 'note-1',
        authorUser: { id: 'other-user' },
        authorGuest: null,
      });

      await expect(
        service.update('note-1', { content: 'x' }, buildUser({ id: 'user-1' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('permite al autor actualizar su propia nota', async () => {
      const note = {
        id: 'note-1',
        track: { id: 'track-1' },
        playlist: null,
        authorUser: { id: 'user-1', name: 'User', lastName: 'One' },
        authorGuest: null,
        content: 'vieja',
      };
      trackNoteRepo.findOne.mockResolvedValue(note);

      await service.update('note-1', { content: 'nueva' }, buildUser({ id: 'user-1' }));

      expect(trackNoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'nueva' }),
      );
    });
  });

  describe('remove', () => {
    it('lanza ForbiddenException si el usuario no es el autor', async () => {
      trackNoteRepo.findOne.mockResolvedValue({
        id: 'note-1',
        authorUser: { id: 'other-user' },
        authorGuest: null,
      });

      await expect(service.remove('note-1', buildUser({ id: 'user-1' }))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(trackNoteRepo.softRemove).not.toHaveBeenCalled();
    });

    it('hace soft-delete cuando el usuario es el autor', async () => {
      const note = { id: 'note-1', authorUser: { id: 'user-1' }, authorGuest: null };
      trackNoteRepo.findOne.mockResolvedValue(note);

      await service.remove('note-1', buildUser({ id: 'user-1' }));

      expect(trackNoteRepo.softRemove).toHaveBeenCalledWith(note);
    });
  });
});
