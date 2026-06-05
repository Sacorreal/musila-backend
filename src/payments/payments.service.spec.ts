import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaymentSource } from './entities/payment-source.entity';
import {
  PendingRegistration,
  PendingRegistrationStatus,
} from './entities/pending-registration.entity';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER } from './domain/payment-provider.interface';
import { ProviderTransactionStatus } from './domain/payment-provider.types';

const makeMockRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  save: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest.fn(),
  ...overrides,
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: ReturnType<typeof makeMockRepo>;
  let pendingRepo: ReturnType<typeof makeMockRepo>;
  let paymentSourceRepo: ReturnType<typeof makeMockRepo>;
  let userRepo: ReturnType<typeof makeMockRepo>;
  let provider: {
    name: string;
    generateIntegritySignature: jest.Mock;
    verifyAndParseEvent: jest.Mock;
    getAcceptanceToken: jest.Mock;
    tokenizeCard: jest.Mock;
    createPaymentSource: jest.Mock;
    createTransaction: jest.Mock;
    chargeRecurring: jest.Mock;
  };

  beforeEach(async () => {
    paymentRepo = makeMockRepo();
    pendingRepo = makeMockRepo();
    paymentSourceRepo = makeMockRepo();
    userRepo = makeMockRepo();
    provider = {
      name: 'wompi',
      generateIntegritySignature: jest.fn().mockReturnValue('sig-abc'),
      verifyAndParseEvent: jest.fn(),
      getAcceptanceToken: jest.fn(),
      tokenizeCard: jest.fn(),
      createPaymentSource: jest.fn(),
      createTransaction: jest.fn(),
      chargeRecurring: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const map: Record<string, string> = {
                NODE_ENV: 'local',
                WOMPI_PUBLIC_KEY: 'pub_test_xyz',
                WEB_APP_LOCAL: 'http://localhost:3000',
              };
              return map[key] ?? fallback ?? '';
            }),
          },
        },
        { provide: PAYMENT_PROVIDER, useValue: provider },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(PendingRegistration), useValue: pendingRepo },
        { provide: getRepositoryToken(PaymentSource), useValue: paymentSourceRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createCheckout', () => {
    it('devuelve los parámetros del Widget con firma de integridad y crea el registro pendiente', async () => {
      const result = await service.createCheckout({ role: UserRole.CANTAUTOR, plan: UserPlan.PRO });

      expect(provider.generateIntegritySignature).toHaveBeenCalledWith(
        expect.objectContaining({ amountInCents: 5990000, currency: 'COP' }),
      );
      expect(result.widget).toEqual(
        expect.objectContaining({
          publicKey: 'pub_test_xyz',
          amountInCents: 5990000,
          currency: 'COP',
          signature: 'sig-abc',
        }),
      );
      expect(pendingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.CANTAUTOR,
          status: PendingRegistrationStatus.PENDING,
        }),
      );
    });

    it('usa el precio anual cuando billingPeriod=annual', async () => {
      await service.createCheckout({
        role: UserRole.AUTOR,
        plan: UserPlan.PRO,
        billingPeriod: 'annual',
      });
      expect(provider.generateIntegritySignature).toHaveBeenCalledWith(
        expect.objectContaining({ amountInCents: 35910000 }),
      );
    });
  });

  describe('handleWebhook', () => {
    it('lanza UnauthorizedException si la firma del evento es inválida', async () => {
      provider.verifyAndParseEvent.mockReturnValue(null);
      await expect(service.handleWebhook({ event: 'transaction.updated', data: {} } as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('procesa un pago aprobado y confirma el registro pendiente', async () => {
      provider.verifyAndParseEvent.mockReturnValue({
        transactionId: 'tx-1',
        reference: 'ref-abc',
        status: ProviderTransactionStatus.APPROVED,
        amountInCents: 5990000,
      });
      pendingRepo.findOne.mockResolvedValue({
        id: 'pending-1',
        externalReference: 'ref-abc',
        role: UserRole.CANTAUTOR,
      });

      await service.handleWebhook({ event: 'transaction.updated', data: {} } as any);

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.APPROVED, wompiTransactionId: 'tx-1' }),
      );
      expect(pendingRepo.update).toHaveBeenCalledWith('pending-1', {
        status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
      });
    });

    it('es idempotente: ignora un evento de una transacción ya aprobada', async () => {
      provider.verifyAndParseEvent.mockReturnValue({
        transactionId: 'tx-1',
        reference: 'ref-abc',
        status: ProviderTransactionStatus.APPROVED,
      });
      paymentRepo.findOne.mockResolvedValue({ id: 'p-1', status: PaymentStatus.APPROVED });

      await service.handleWebhook({ event: 'transaction.updated', data: {} } as any);

      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(paymentRepo.update).not.toHaveBeenCalled();
      expect(pendingRepo.update).not.toHaveBeenCalled();
    });

    it('registra un pago declinado sin confirmar el registro', async () => {
      provider.verifyAndParseEvent.mockReturnValue({
        transactionId: 'tx-2',
        reference: 'ref-xyz',
        status: ProviderTransactionStatus.DECLINED,
      });
      pendingRepo.findOne.mockResolvedValue({ id: 'pending-2', role: UserRole.AUTOR });

      await service.handleWebhook({ event: 'transaction.updated', data: {} } as any);

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.REJECTED }),
      );
      expect(pendingRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentStatus', () => {
    it('retorna not_found si no existe el registro', async () => {
      pendingRepo.findOne.mockResolvedValue(null);
      expect((await service.getPaymentStatus('x')).status).toBe('not_found');
    });

    it('retorna approved cuando el pago fue confirmado', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
        role: UserRole.INTERPRETE,
        expiresAt: new Date(Date.now() + 60000),
      });
      const result = await service.getPaymentStatus('ref-ok');
      expect(result.status).toBe('approved');
      expect(result.plan).toBe('pro');
    });

    it('retorna expired si el registro expiró', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 1000),
      });
      expect((await service.getPaymentStatus('ref-exp')).status).toBe('expired');
    });

    it('retorna pending si aún no se confirma', async () => {
      pendingRepo.findOne.mockResolvedValue({
        status: PendingRegistrationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60000),
      });
      expect((await service.getPaymentStatus('ref-pend')).status).toBe('pending');
    });
  });

  describe('createPaymentSource', () => {
    it('tokeniza la tarjeta y crea la fuente de pago sin persistir datos sensibles', async () => {
      provider.getAcceptanceToken.mockResolvedValue('acc-token');
      provider.tokenizeCard.mockResolvedValue({ tokenId: 'tok_1', brand: 'VISA', last4: '4242' });
      provider.createPaymentSource.mockResolvedValue({ paymentSourceId: '555', status: 'AVAILABLE' });
      paymentSourceRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'ps-1', ...v }));

      const result = await service.createPaymentSource('user-1', {
        number: '4242424242424242',
        cvc: '123',
        expMonth: '08',
        expYear: '28',
        cardHolder: 'JUAN PEREZ',
        customerEmail: 'juan@musila.com',
      });

      const saved = paymentSourceRepo.save.mock.calls[0][0];
      expect(saved).not.toHaveProperty('number');
      expect(saved).not.toHaveProperty('cvc');
      expect(saved.wompiPaymentSourceId).toBe('555');
      expect(result.last4).toBe('4242');
    });
  });
});
