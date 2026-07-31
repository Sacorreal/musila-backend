import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import supertest from 'supertest';
const request = supertest as any;

import { WalletController } from './../src/wallet/wallet.controller';
import { WalletAdminController } from './../src/wallet/wallet-admin.controller';
import { WalletEarningsService } from './../src/wallet/services/wallet-earnings.service';
import { WalletWithdrawalsService } from './../src/wallet/services/wallet-withdrawals.service';
import { WalletWithdrawalStatus } from './../src/wallet/entities/wallet-withdrawal-status.enum';
import { JWTAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { PlansGuard } from './../src/users/guards/plans.guard';
import { UserPlanType } from './../src/users/entities/user-plan-type.enum';

/**
 * E2E de la capa HTTP de Wallet: flujo "crear retiro -> admin lo paga".
 * Los servicios se mockean (sin BD real) para aislar routing, guards y
 * validación de DTOs; la lógica de negocio ya está cubierta por los
 * unit tests de WalletDistributionService/WalletEarningsService/WalletWithdrawalsService.
 */
describe('Wallet (e2e)', () => {
  let app: INestApplication;

  const getBalance = jest.fn();
  const createWithdrawal = jest.fn();
  const findAllAdmin = jest.fn();
  const markPaid = jest.fn();

  const asUser = (user: { id: string; planType: UserPlanType }) => ({
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = { id: user.id, email: 'user@musila.com', name: 'Test', planType: user.planType };
      return true;
    },
  });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [WalletController, WalletAdminController],
      providers: [
        {
          provide: WalletEarningsService,
          useValue: { getBalance, getEarningsHistory: jest.fn() },
        },
        {
          provide: WalletWithdrawalsService,
          useValue: {
            create: createWithdrawal,
            findForUser: jest.fn(),
            findOneForUser: jest.fn(),
            findAllAdmin,
            findOneAdmin: jest.fn(),
            markInProcess: jest.fn(),
            markPaid,
            reject: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue(asUser({ id: 'user-1', planType: UserPlanType.PLAN_AUTOR }))
      .overrideGuard(PlansGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getBalance.mockReset();
    createWithdrawal.mockReset();
    findAllAdmin.mockReset();
    markPaid.mockReset();
  });

  it('GET /wallet/balance devuelve el saldo del usuario autenticado', async () => {
    getBalance.mockResolvedValue({
      totalEarnedOwn: 100000,
      totalEarnedCoauthor: 0,
      totalEarned: 100000,
      totalWithdrawnPaid: 0,
      totalReserved: 0,
      availableBalance: 100000,
      currency: 'COP',
    });

    await request(app.getHttpServer())
      .get('/wallet/balance')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.availableBalance).toBe(100000);
      });

    expect(getBalance).toHaveBeenCalledWith('user-1');
  });

  it('POST /wallet/withdrawals rechaza un monto no numérico (validación de DTO)', async () => {
    await request(app.getHttpServer())
      .post('/wallet/withdrawals')
      .send({ amount: 'no-es-un-numero' })
      .expect(400);

    expect(createWithdrawal).not.toHaveBeenCalled();
  });

  it('POST /wallet/withdrawals crea la solicitud para el usuario autenticado', async () => {
    createWithdrawal.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PENDING, amount: 50000 });

    await request(app.getHttpServer())
      .post('/wallet/withdrawals')
      .send({ amount: 50000 })
      .expect(201)
      .expect((res: any) => {
        expect(res.body.status).toBe(WalletWithdrawalStatus.PENDING);
      });

    expect(createWithdrawal).toHaveBeenCalledWith('user-1', { amount: 50000 });
  });

  it('PATCH /wallet/admin/withdrawals/:id/pay marca la solicitud como pagada', async () => {
    markPaid.mockResolvedValue({ id: 'wd-1', status: WalletWithdrawalStatus.PAID });

    await request(app.getHttpServer())
      .patch('/wallet/admin/withdrawals/wd-1/pay')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe(WalletWithdrawalStatus.PAID);
      });

    expect(markPaid).toHaveBeenCalledWith('wd-1', 'user-1');
  });

  it('GET /wallet/admin/withdrawals lista las solicitudes (Admin)', async () => {
    findAllAdmin.mockResolvedValue({ data: [], total: 0, limit: 10, offset: 0 });

    await request(app.getHttpServer()).get('/wallet/admin/withdrawals').expect(200);

    expect(findAllAdmin).toHaveBeenCalled();
  });
});
