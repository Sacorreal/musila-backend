import { WorkSocietyAffiliationSnapshotService } from './work-society-affiliation-snapshot.service';
import { SocietyAffiliationRightsType } from 'src/society-affiliation/entities/society-affiliation-rights-type.enum';

describe('WorkSocietyAffiliationSnapshotService', () => {
  let service: WorkSocietyAffiliationSnapshotService;
  let participantRepo: any;
  let snapshotRepo: any;
  let societyAffiliationService: any;

  beforeEach(() => {
    participantRepo = { find: jest.fn() };
    snapshotRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    societyAffiliationService = { findActiveForAuthor: jest.fn() };

    service = new WorkSocietyAffiliationSnapshotService(participantRepo, snapshotRepo, societyAffiliationService);
  });

  it('crea un snapshot por cada afiliación ACTIVE (PR y MR) del autor vinculado', async () => {
    participantRepo.find.mockResolvedValue([
      { id: 'participant-1', splitAuthor: { user: { id: 'author-1' } } },
    ]);
    societyAffiliationService.findActiveForAuthor.mockResolvedValue([
      {
        id: 'aff-pr',
        collectiveManagementSocietyId: 'cms-sayco',
        collectiveManagementSociety: { officialName: 'SAYCO', cisacSocietyId: '84' },
        rightsType: SocietyAffiliationRightsType.PR,
        territory: 'CO',
        ipiNameNumber: '12345678901',
        membershipNumber: '123',
      },
      {
        id: 'aff-mr',
        collectiveManagementSocietyId: 'cms-sayco',
        collectiveManagementSociety: { officialName: 'SAYCO', cisacSocietyId: '84' },
        rightsType: SocietyAffiliationRightsType.MR,
        territory: 'CO',
        ipiNameNumber: '12345678901',
        membershipNumber: '123',
      },
    ]);

    await service.syncForParticipants('rf-1', [{ id: 'participant-1' } as any]);

    expect(snapshotRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ registrationFileParticipantId: 'participant-1', rightsType: SocietyAffiliationRightsType.PR }),
      expect.objectContaining({ registrationFileParticipantId: 'participant-1', rightsType: SocietyAffiliationRightsType.MR }),
    ]);
  });

  it('no crea snapshots para un participante externo (sin splitAuthor.user)', async () => {
    participantRepo.find.mockResolvedValue([{ id: 'participant-2', splitAuthor: null }]);

    await service.syncForParticipants('rf-1', [{ id: 'participant-2' } as any]);

    expect(societyAffiliationService.findActiveForAuthor).not.toHaveBeenCalled();
    expect(snapshotRepo.save).not.toHaveBeenCalled();
  });

  it('no hace nada si la lista de participantes está vacía', async () => {
    await service.syncForParticipants('rf-1', []);

    expect(participantRepo.find).not.toHaveBeenCalled();
    expect(snapshotRepo.save).not.toHaveBeenCalled();
  });
});
