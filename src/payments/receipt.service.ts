import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import puppeteer from 'puppeteer';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { Payment, PaymentStatus, PaymentType } from './entities/payment.entity';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private readonly configService: ConfigService,
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

    const html = this.buildReceiptHtml(payment, user);
    return this.renderPdf(html);
  }

  private buildReceiptHtml(payment: Payment, user: User): string {
    const ref = payment.id.substring(0, 8).toUpperCase();
    const planLabel = this.getPlanLabel(payment);
    const dateStr = this.formatDate(payment.createdAt);
    const expiresStr = payment.expiresAt ? this.formatDate(payment.expiresAt) : null;
    const amount = this.formatCurrency(Number(payment.amount ?? 0));
    const clientName = [user.name, user.secondName, user.lastName, user.secondLastName]
      .filter(Boolean)
      .join(' ');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #111827;
      padding: 48px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #7c3aed;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 30px;
      font-weight: 900;
      color: #7c3aed;
      letter-spacing: -1px;
    }
    .logo-sub {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 2px;
    }
    .receipt-meta { text-align: right; }
    .receipt-meta h2 {
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 4px;
    }
    .receipt-meta .ref {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .amount-box {
      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
      border-radius: 14px;
      padding: 28px;
      text-align: center;
      color: white;
      margin-bottom: 20px;
    }
    .amount-label {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 6px;
    }
    .amount-value {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    .amount-currency {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 4px;
    }
    .section {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #9ca3af;
      margin-bottom: 14px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    }
    .row:last-child { margin-bottom: 0; }
    .lbl { font-size: 13px; color: #6b7280; }
    .val { font-size: 14px; font-weight: 600; color: #111827; }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
      color: #9ca3af;
      font-size: 11px;
      line-height: 1.7;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="logo">musila</div>
      <div class="logo-sub">Plataforma de Licencias Musicales</div>
    </div>
    <div class="receipt-meta">
      <h2>Comprobante de Pago</h2>
      <div class="ref">Referencia: ${ref}</div>
      <span class="badge">Aprobado</span>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-label">Total Pagado</div>
    <div class="amount-value">${amount}</div>
    <div class="amount-currency">Pesos Colombianos (COP)</div>
  </div>

  <div class="section">
    <div class="section-title">Información del Cliente</div>
    <div class="row">
      <span class="lbl">Nombre</span>
      <span class="val">${clientName}</span>
    </div>
    <div class="row">
      <span class="lbl">Correo electrónico</span>
      <span class="val">${user.email}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalle del Servicio</div>
    <div class="row">
      <span class="lbl">Plan adquirido</span>
      <span class="val">${planLabel}</span>
    </div>
    <div class="row">
      <span class="lbl">Fecha de pago</span>
      <span class="val">${dateStr}</span>
    </div>
    ${
      expiresStr
        ? `<div class="row">
      <span class="lbl">Válido hasta</span>
      <span class="val">${expiresStr}</span>
    </div>`
        : ''
    }
  </div>

  <div class="section">
    <div class="section-title">Transacción</div>
    <div class="row">
      <span class="lbl">Referencia interna</span>
      <span class="val">${ref}</span>
    </div>
    ${
      payment.wompiTransactionId
        ? `<div class="row">
      <span class="lbl">ID Wompi</span>
      <span class="val">#${payment.wompiTransactionId}</span>
    </div>`
        : ''
    }
    <div class="row">
      <span class="lbl">Procesado por</span>
      <span class="val">Wompi</span>
    </div>
  </div>

  <div class="footer">
    <p><strong>musila.com</strong> — Plataforma de Licencias Musicales</p>
    <p>Este comprobante es generado automáticamente y tiene validez como constancia de pago.</p>
    <p>Para soporte escríbenos a soporte@musila.com</p>
  </div>

</body>
</html>`;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const executablePath =
      this.configService.get<string>('CHROME_PATH') ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    this.logger.log(`Generando PDF con Chrome en: ${executablePath}`);

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private getPlanLabel(payment: Payment): string {
    const roleNames: Partial<Record<UserRole, string>> = {
      [UserRole.AUTOR]: 'Autor',
      [UserRole.CANTAUTOR]: 'Cantautor',
      [UserRole.INTERPRETE]: 'Intérprete',
    };
    const roleName = roleNames[payment.roleType] ?? payment.roleType;

    if (payment.paymentType === PaymentType.ONE_TIME) {
      return `${roleName} Pro — Vitalicio`;
    }

    const ANNUAL_THRESHOLD = 100_000;
    const isAnnual = Number(payment.amount ?? 0) >= ANNUAL_THRESHOLD;
    return `${roleName} Pro — ${isAnnual ? 'Anual' : 'Mensual'}`;
  }

  private formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-CO')}`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
