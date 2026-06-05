import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { Injectable, InternalServerErrorException, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { renderToBuffer } from '@react-pdf/renderer';
import { User } from 'src/users/entities/user.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PendingRegistration, PendingRegistrationStatus } from './entities/pending-registration.entity';
import { ReceiptDoc } from './receipt-template';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PendingRegistration)
    private readonly pendingRepo: Repository<PendingRegistration>,
  ) {}

  async generateReceipt(paymentId: string, requestingUserId: string): Promise<Buffer> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });

    if (!payment) throw new NotFoundException('Pago no encontrado');

    // Verificar propiedad: userId directo o via pending_registration
    const ownedDirectly = payment.userId === requestingUserId;
    const ownedViaPending = !ownedDirectly && payment.externalReference
      ? await this.pendingRepo.findOne({
          where: {
            externalReference: payment.externalReference,
            userId: requestingUserId,
            status: PendingRegistrationStatus.PAYMENT_CONFIRMED,
          },
        }).then(Boolean)
      : false;

    if (!ownedDirectly && !ownedViaPending) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (payment.status !== PaymentStatus.APPROVED) {
      throw new UnprocessableEntityException(
        'Solo se pueden descargar comprobantes de pagos aprobados',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: requestingUserId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    this.logger.log(`Generando comprobante PDF para pago ${paymentId}`);

    // Leer el logo como base64. Si falla, el PDF se genera sin imagen.
    let logoSrc: string | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'src', 'payments', 'assets', 'logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
      this.logger.warn(`No se pudo cargar el logo: ${(err as any)?.message}`);
    }

    return this.renderPdf(paymentId, payment, user, logoSrc);
  }

  private async renderPdf(
    paymentId: string,
    payment: Payment,
    user: User,
    logoSrc?: string,
  ): Promise<Buffer> {
    try {
      const el = React.createElement(ReceiptDoc, { payment, user, logoSrc });
      const buffer = await renderToBuffer(el as any);
      this.logger.log(`PDF generado correctamente para pago ${paymentId} (${buffer.length} bytes)`);
      return buffer;
    } catch (err) {
      if (logoSrc) {
        // Reintentar sin imagen — puede que @react-pdf/renderer rechace el data URI
        this.logger.warn(`PDF con logo falló, reintentando sin imagen: ${(err as any)?.message}`);
        return this.renderPdf(paymentId, payment, user, undefined);
      }
      this.logger.error(`Error generando PDF para pago ${paymentId}: ${err}`);
      throw new InternalServerErrorException('No se pudo generar el comprobante PDF');
    }
  }
}
