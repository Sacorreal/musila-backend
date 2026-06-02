import { HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Payment, PaymentStatus, PaymentType } from './entities/payment.entity';
import { PendingRegistration, PendingRegistrationStatus } from './entities/pending-registration.entity';
import { PaymentsService } from './payments.service';

jest.mock('mercadopago', () => {
  return {
    MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
    Preference: jest.fn().mockImplementation(() => ({
      create: jest.fn().mockResolvedValue({ init_point: 'https://mp.com/checkout/test' }),
    })),
    Payment: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      search: jest.fn().mockResolvedValue({ results: [] }),
    })),
  };
});

const makeMockRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  save: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue(0),
  ...overrides,
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof makeMockRepo>;
  let pendingRepo: ReturnType<typeof makeMockRepo>;
  let userRepo: ReturnType<typeof makeMockRepo>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    paymentRepo = makeMockRepo();
    pendingRepo = makeMockRepo();
    userRepo = makeMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                MP_ACCESS_TOKEN: 'TEST-token',
                MP_PUBLIC_KEY: 'TEST-key',
                MP_WEBHOOK_SECRET: 'secret123',
                API_ENDPOINT: 'http://localhost:3001',
                WEB_APP_LOCAL: 'http://localhost:3000',
              };
              return map[key] ?? fallback ?? '';
            }),
          },
        },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(PendingRegistration), useValue: pendingRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    configService = module.get(ConfigService);
  });

  // ─── createPreference ────────────────────────────────────────────────────────

  describe('createPreference', () => {
    it('debe retornar initPoint y externalReference para un plan pro', async () => {
      const result = await service.createPreference({ role: UserRole.CANTAUTOR, plan: UserPlan.PRO });

      expect(result).toHaveProperty('initPoint');
      expect(result).toHaveProperty('externalReference');
      expect(typeof result.initPoint).toBe('string');
      expect(pendingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.CANTAUTOR,
          plan: UserPlan.PRO,
          status: PendingRegistrationStatus.PENDING,
        }),
      );
    });

    it('debe crear preferencia con pago único para Intérprete Pro', async () => {
      const result = await service.createPreference({ role: UserRole.INTERPRETE, plan: UserPlan.PRO });

      expect(result).toHaveProperty('initPoint');
      expect(pendingRepo.save).toHaveBeenCalled();
    });
  });

  // ─── handleWebhook ───────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('debe lanzar UnauthorizedException si la firma es inválida', async () => {
      // NODE_ENV distinto de 'local' para activar la validación de firma
      (configService.get as jest.Mock).mockImplementation((key: string, fallback?: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'MP_WEBHOOK_SECRET') return 'secret123';
        return fallback ?? '';
      });

      await expect(
        service.handleWebhook({ type: 'payment', data: { id: '123' } }, 'firma-incorrecta', 'req-id'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe procesar un pago aprobado y actualizar el PendingRegistration', async () => {
      const mockPending: Partial<PendingRegistration> = {
        id: 'pending-1',
        externalReference: 'ref-abc',
        role: UserRole.CANTAUTOR,
        plan: UserPlan.PRO,
        status: PendingRegistrationStatus.PENDING,
        userId: undefined,
      };

      const { Payment: MockMPPayment } = require('mercadopago');
      MockMPPayment.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue({
          external_reference: 'ref-abc',
          status: 'approved',
          transaction_amount: 59900,
        }),
      }));

      pendingRepo.findOne.mockResolvedValue(mockPending);

      await service.handleWebhook({ type: 'payment', data: { id: '999' } }, 'secret123', 'req-id');

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.APPROVED }),
      );
      expect(pendingRepo.update).toHaveBeenCalledWith(
        'pending-1',
        { status: PendingRegistrationStatus.PAYMENT_CONFIRMED },
      );
    });

    it('debe registrar un pago rechazado sin actualizar el plan', async () => {
      const { Payment: MockMPPayment } = require('mercadopago');
      MockMPPayment.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue({
          external_reference: 'ref-xyz',
          status: 'rejected',
          transaction_amount: 39900,
        }),
      }));

      pendingRepo.findOne.mockResolvedValue(null);

      await service.handleWebhook({ type: 'payment', data: { id: '888' } }, 'secret123', 'req-id');

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.REJECTED }),
      );
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('debe degradar el plan a free cuando la suscripción es cancelada', async () => {
      const mockUser: Partial<User> = {
        id: 'user-42',
        role: UserRole.CANTAUTOR,
        plan: UserPlan.PRO,
      };
      userRepo.findOne.mockResolvedValue(mockUser);

      await service.handleWebhook(
        {
          type: 'subscription_authorized_payment',
          data: { status: 'cancelled', payer_id: 'user-42' },
        },
        'secret123',
        'req-id',
      );

      expect(userRepo.update).toHaveBeenCalledWith('user-42', { plan: UserPlan.FREE });
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.CANCELLED,
          planType: UserPlan.FREE,
          paymentType: PaymentType.SUBSCRIPTION,
        }),
      );
    });

    it('no debe procesar suscripción con status distinto a cancelled', async () => {
      await service.handleWebhook(
        {
          type: 'subscription_authorized_payment',
          data: { status: 'authorized', payer_id: 'user-1' },
        },
        'secret123',
        'req-id',
      );

      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  // ─── getPaymentStatus ─────────────────────────────────────────────────────────

  describe('getPaymentStatus', () => {
    it('debe retornar not_found si no existe el PendingRegistration', async () => {
      pendingRepo.findOne.mockResolvedValue(null);
      const result = await service.getPaymentStatus('ref-inexistente');
      expect(result.status).toBe('not_found');
    });

    it('debe retornar approved cuando el pago fue confirmado', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
        userId: 'user-1',
        role: UserRole.INTERPRETE,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await service.getPaymentStatus('ref-ok');
      expect(result.status).toBe('approved');
      expect(result.plan).toBe('pro');
    });

    it('debe retornar expired si el PendingRegistration está expirado', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.getPaymentStatus('ref-exp');
      expect(result.status).toBe('expired');
    });

    it('debe retornar pending si el pago aún no fue confirmado', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await service.getPaymentStatus('ref-pend');
      expect(result.status).toBe('pending');
    });
  });
});
