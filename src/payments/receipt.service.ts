import React from 'react';
import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { pdf } from '@react-pdf/renderer';
import { User } from 'src/users/entities/user.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { ReceiptDoc } from './receipt-template';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async generateReceipt(paymentId: string, requestingUserId: string): Promise<Buffer> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });

    if (!payment || payment.userId !== requestingUserId) {
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
    const element = React.createElement(ReceiptDoc, { payment, user });
    // pdf() types target the browser API; in Node.js toBuffer() returns Buffer
    return await (pdf(element as any).toBuffer() as unknown as Promise<Buffer>);
  }
}
