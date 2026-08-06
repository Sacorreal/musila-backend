import { RequestedTrackLegalProofListener } from './requested-track-legal-proof.listener';

describe('RequestedTrackLegalProofListener', () => {
  let listener: RequestedTrackLegalProofListener;
  let requestedTrackRepo: { findOne: jest.Mock };
  let legalProofService: { generateProof: jest.Mock };

  const requestedTrack = {
    id: 'request-1',
    track: { id: 'track-1' },
    owner: { id: 'owner-1' },
    requester: { id: 'requester-1' },
    licenseType: 'primer_uso',
  };

  beforeEach(() => {
    requestedTrackRepo = { findOne: jest.fn().mockResolvedValue(requestedTrack) };
    legalProofService = { generateProof: jest.fn().mockResolvedValue({}) };

    listener = new RequestedTrackLegalProofListener(requestedTrackRepo as any, legalProofService as any);
  });

  it('genera evidencia legal con entityType LICENSE_REQUEST al aprobarse manualmente', async () => {
    await listener.handleManualApproval({
      requestId: 'request-1',
      chatId: 'chat-1',
      trackTitle: 'Canción',
      requesterId: 'requester-1',
      approvedByUserId: 'owner-1',
    });

    expect(requestedTrackRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      relations: ['track', 'owner', 'requester'],
    });
    expect(legalProofService.generateProof).toHaveBeenCalledWith(
      expect.objectContaining({
        context: {
          entityType: 'license_request',
          entityId: 'request-1',
          requestedByUserId: 'owner-1',
        },
      }),
    );
  });

  it('genera evidencia legal con entityType LICENSE_REQUEST al aprobarse por pago', async () => {
    await listener.handlePaymentApproval({
      requestId: 'request-1',
      chatId: 'chat-1',
      trackTitle: 'Canción',
      requesterId: 'requester-1',
      ownerId: 'owner-1',
    });

    expect(legalProofService.generateProof).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ entityType: 'license_request', requestedByUserId: 'requester-1' }),
      }),
    );
  });

  it('no lanza si la solicitud ya no existe', async () => {
    requestedTrackRepo.findOne.mockResolvedValue(null);

    await expect(
      listener.handleManualApproval({
        requestId: 'inexistente',
        chatId: '',
        trackTitle: '',
        requesterId: 'requester-1',
        approvedByUserId: 'owner-1',
      }),
    ).resolves.toBeUndefined();

    expect(legalProofService.generateProof).not.toHaveBeenCalled();
  });

  it('no lanza si generateProof falla', async () => {
    legalProofService.generateProof.mockRejectedValue(new Error('timestamp provider down'));

    await expect(
      listener.handleManualApproval({
        requestId: 'request-1',
        chatId: '',
        trackTitle: '',
        requesterId: 'requester-1',
        approvedByUserId: 'owner-1',
      }),
    ).resolves.toBeUndefined();
  });
});
