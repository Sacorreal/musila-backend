import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import supertest from 'supertest';
const request = supertest as any;
// Evita cargar puppeteer (ESM) a través de ReceiptService durante el e2e.
jest.mock('./../src/payments/receipt.service', () => ({ ReceiptService: class {} }));

import { PaymentsController } from './../src/payments/payments.controller';
import { PaymentsService } from './../src/payments/payments.service';
import { ReceiptService } from './../src/payments/receipt.service';
import { JWTAuthGuard } from './../src/auth/guards/jwt-auth.guard';

/**
 * E2E enfocado en la capa HTTP del webhook de Wompi.
 * El servicio se mockea para aislar el flujo del endpoint (firma válida/inválida
 * y los distintos estados de transacción) sin requerir base de datos.
 */
describe('Payments Wompi webhook (e2e)', () => {
  let app: INestApplication;
  const handleWebhook = jest.fn();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: { handleWebhook } },
        { provide: ReceiptService, useValue: {} },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => handleWebhook.mockReset());

  const event = (status: string) => ({
    event: 'transaction.updated',
    data: { transaction: { id: 'tx-1', reference: 'ref-1', status } },
    signature: { properties: ['transaction.id', 'transaction.status'], checksum: 'abc' },
    timestamp: 1700000000,
  });

  it.each(['APPROVED', 'DECLINED', 'VOIDED'])(
    'responde 200 para un evento %s con firma válida',
    async (status) => {
      handleWebhook.mockResolvedValue(undefined);
      await request(app.getHttpServer())
        .post('/payments/wompi/webhook')
        .send(event(status))
        .expect(200)
        .expect({ received: true });
      expect(handleWebhook).toHaveBeenCalledWith(expect.objectContaining({ event: 'transaction.updated' }));
    },
  );

  it('responde 401 cuando la firma del evento es inválida', async () => {
    handleWebhook.mockRejectedValue(new UnauthorizedException('Firma de webhook inválida'));
    await request(app.getHttpServer())
      .post('/payments/wompi/webhook')
      .send(event('APPROVED'))
      .expect(401);
  });
});
