import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LicenseCollectionsService } from './license-collections.service';
import { LicenseCollection } from './entities/license-collection.entity';
import { CollectionStatus } from './entities/collection-status.enum';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicenseType } from 'src/requested-tracks/entities/license-type.enum';
import { LicensePaymentStatus } from 'src/requested-tracks/entities/license-payment-status.enum';
import { PaymentLinkTokenService } from './services/payment-link-token.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { EmailService } from 'src/shared/mail/services/email.service';

const makeMockRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn((data: Record<string, unknown>) => data),
  save: jest.fn((data: Record<string, unknown>) => Promise.resolve({ id: 'collection-id', ...data })),
  createQueryBuilder: jest.fn(),
  ...overrides,
});

const baseRequestedTrack = (): RequestedTrack =>
  ({
    id: 'track-request-id',
    licenseType: LicenseType.LICENCIA_DE_PRIMER_USO,
    status: RequestsStatus.PENDIENTE,
    licensePaymentStatus: LicensePaymentStatus.NONE,
    requester: { id: 'requester-id', email: 'requester@example.com', name: 'Requester' },
    track: { title: 'Mi canción' },
  }) as unknown as RequestedTrack;

describe('LicenseCollectionsService', () => {
  let service: LicenseCollectionsService;
  let collectionRepo: ReturnType<typeof makeMockRepo>;
  let requestedTrackRepo: ReturnType<typeof makeMockRepo>;
  let tokenService: { sign: jest.Mock; signBatch: jest.Mock; verify: jest.Mock };
  let eventBus: { emit: jest.Mock };
  let notificationsService: { createNotification: jest.Mock };
  let emailService: { sendLicenseCollectionPaymentLinkEmail: jest.Mock };

  beforeEach(async () => {
    collectionRepo = makeMockRepo();
    requestedTrackRepo = makeMockRepo();
    tokenService = {
      sign: jest.fn().mockResolvedValue({ token: 'signed-token', expiresAt: new Date() }),
      signBatch: jest.fn(),
      verify: jest.fn(),
    };
    eventBus = { emit: jest.fn() };
    notificationsService = { createNotification: jest.fn().mockResolvedValue({}) };
    emailService = { sendLicenseCollectionPaymentLinkEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseCollectionsService,
        { provide: getRepositoryToken(LicenseCollection), useValue: collectionRepo },
        { provide: getRepositoryToken(RequestedTrack), useValue: requestedTrackRepo },
        { provide: PaymentLinkTokenService, useValue: tokenService },
        { provide: EventBusService, useValue: eventBus },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              const map: Record<string, unknown> = {
                NODE_ENV: 'local',
                WEB_APP_LOCAL: 'http://localhost:3000',
                LICENSE_COLLECTION_MAX_SEND_ATTEMPTS: 3,
              };
              return map[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LicenseCollectionsService>(LicenseCollectionsService);
  });

  describe('create', () => {
    const dto = { requestedTrackId: 'track-request-id', amount: 100000, dueDate: new Date(Date.now() + 86400000).toISOString() };

    it('lanza NotFoundException si la solicitud no existe', async () => {
      requestedTrackRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException si la licencia no es de primer uso', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({ ...baseRequestedTrack(), licenseType: LicenseType.LICENCIA_REPRODUCCION });
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException si la solicitud ya fue pagada', async () => {
      requestedTrackRepo.findOne.mockResolvedValue({
        ...baseRequestedTrack(),
        licensePaymentStatus: LicensePaymentStatus.APPROVED,
      });
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException si la fecha pactada no es futura', async () => {
      requestedTrackRepo.findOne.mockResolvedValue(baseRequestedTrack());
      await expect(
        service.create({ ...dto, dueDate: new Date(Date.now() - 86400000).toISOString() }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException si ya existe un cobro activo para la solicitud', async () => {
      requestedTrackRepo.findOne.mockResolvedValue(baseRequestedTrack());
      collectionRepo.findOne.mockResolvedValueOnce({ id: 'existing-collection', status: CollectionStatus.PENDIENTE });
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea el cobro cuando todas las validaciones pasan', async () => {
      requestedTrackRepo.findOne.mockResolvedValue(baseRequestedTrack());
      collectionRepo.findOne
        .mockResolvedValueOnce(null) // sin cobro activo previo
        .mockResolvedValueOnce({ id: 'collection-id', status: CollectionStatus.PENDIENTE }); // findWithRelations tras guardar

      const result = await service.create(dto);

      expect(collectionRepo.save).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 'collection-id' }));
    });
  });

  describe('attemptSend', () => {
    const activeCollection = () => ({
      id: 'collection-id',
      amount: 100000,
      dueDate: new Date(),
      status: CollectionStatus.PENDIENTE,
      sendAttempts: 0,
      requestedTrack: baseRequestedTrack(),
    });

    it('marca ENLACE_ENVIADO y notifica cuando el envío es exitoso', async () => {
      collectionRepo.findOne.mockResolvedValue(activeCollection());

      const result = await service.attemptSend('collection-id');

      expect(emailService.sendLicenseCollectionPaymentLinkEmail).toHaveBeenCalled();
      expect(notificationsService.createNotification).toHaveBeenCalled();
      expect(result.status).toBe(CollectionStatus.ENLACE_ENVIADO);
      expect(eventBus.emit).toHaveBeenCalledWith('license.collection.link.sent', expect.anything());
    });

    it('registra el error y notifica al administrador al agotar los reintentos', async () => {
      collectionRepo.findOne.mockResolvedValue({ ...activeCollection(), sendAttempts: 2 });
      emailService.sendLicenseCollectionPaymentLinkEmail.mockRejectedValue(new Error('Resend caído'));

      const result = await service.attemptSend('collection-id');

      expect(result.status).toBe(CollectionStatus.PENDIENTE);
      expect(result.lastSendError).toBe('Resend caído');
      expect(eventBus.emit).toHaveBeenCalledWith(
        'license.collection.send.exhausted',
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  describe('retrySend', () => {
    it('lanza BadRequestException si el cobro ya fue pagado', async () => {
      collectionRepo.findOne.mockResolvedValue({ id: 'collection-id', status: CollectionStatus.PAGADO });
      await expect(service.retrySend('collection-id')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('markPaidFromRequestedTrack', () => {
    it('marca el cobro activo como pagado', async () => {
      const collection = { id: 'collection-id', status: CollectionStatus.ENLACE_ENVIADO };
      collectionRepo.findOne.mockResolvedValue(collection);

      await service.markPaidFromRequestedTrack('track-request-id');

      expect(collectionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: CollectionStatus.PAGADO }),
      );
    });

    it('no hace nada si no hay cobro activo para la solicitud', async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await service.markPaidFromRequestedTrack('track-request-id');
      expect(collectionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('markOverdue', () => {
    it('marca EN_MORA y emite el evento de vencimiento', async () => {
      const collection = {
        id: 'collection-id',
        status: CollectionStatus.ENLACE_ENVIADO,
        dueDate: new Date(),
        requestedTrack: baseRequestedTrack(),
      } as unknown as LicenseCollection;

      await service.markOverdue(collection);

      expect(collection.status).toBe(CollectionStatus.EN_MORA);
      expect(eventBus.emit).toHaveBeenCalledWith('license.collection.overdue', expect.anything());
    });
  });
});
