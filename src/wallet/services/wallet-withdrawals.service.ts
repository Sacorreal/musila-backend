import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { WalletWithdrawal } from '../entities/wallet-withdrawal.entity';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';
import { WalletWithdrawalOrigin } from '../entities/wallet-withdrawal-origin.enum';
import { WithdrawalPaginationDto } from '../dto/withdrawal-pagination.dto';
import { WalletEarningsService } from './wallet-earnings.service';

const REQUIRED_BANK_FIELDS = [
  'bankName',
  'accountType',
  'accountNumber',
  'accountHolderName',
  'accountHolderIdType',
  'accountHolderIdNumber',
] as const;

@Injectable()
export class WalletWithdrawalsService {
  private readonly logger = new Logger(WalletWithdrawalsService.name);

  constructor(
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    private readonly earningsService: WalletEarningsService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Genera automáticamente el retiro semanal de un usuario por su saldo
   * disponible completo. Ya no existe una solicitud manual: la ejecuta el
   * cron de pago de los lunes (`WalletAutoPayoutCron`). Devuelve `null` (y
   * registra el motivo) cuando no hay nada que pagar o faltan datos
   * bancarios, para que el lote continúe con el resto de usuarios.
   */
  async createScheduled(userId: string): Promise<WalletWithdrawal | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`[wallet-auto-payout] usuario=${userId} no encontrado, se omite`);
      return null;
    }

    if (!this.isBankAccountComplete(user.bankAccount)) {
      this.logger.warn(`[wallet-auto-payout] usuario=${userId} sin datos bancarios completos, se omite`);
      return null;
    }

    const { availableBalance, currency } = await this.earningsService.getBalance(userId);
    if (availableBalance <= 0) return null;

    const withdrawal = await this.withdrawalRepo.save({
      user,
      amount: availableBalance,
      currency,
      status: WalletWithdrawalStatus.PENDING,
      bankAccountSnapshot: user.bankAccount,
      origin: WalletWithdrawalOrigin.SCHEDULED,
    });

    this.eventBus.emit('wallet.withdrawal.requested', {
      withdrawalId: withdrawal.id,
      userId: user.id,
      userName: `${user.name} ${user.lastName}`,
      userEmail: user.email,
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      requestedAt: withdrawal.createdAt,
    });

    return withdrawal;
  }

  /** Análogo a {@link createScheduled} para la wallet de una organización (publisher). */
  async createScheduledForOrganization(organizationId: string): Promise<WalletWithdrawal | null> {
    const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!organization) {
      this.logger.warn(`[wallet-auto-payout] organización=${organizationId} no encontrada, se omite`);
      return null;
    }

    if (!this.isBankAccountComplete(organization.bankAccount)) {
      this.logger.warn(`[wallet-auto-payout] organización=${organizationId} sin datos bancarios completos, se omite`);
      return null;
    }

    const { availableBalance, currency } = await this.earningsService.getOrganizationBalance(organizationId);
    if (availableBalance <= 0) return null;

    const withdrawal = await this.withdrawalRepo.save({
      beneficiaryOrganization: organization,
      amount: availableBalance,
      currency,
      status: WalletWithdrawalStatus.PENDING,
      bankAccountSnapshot: organization.bankAccount,
      origin: WalletWithdrawalOrigin.SCHEDULED,
    });

    this.eventBus.emit('wallet.withdrawal.requested', {
      withdrawalId: withdrawal.id,
      userId: '',
      userName: organization.name,
      userEmail: '',
      amount: withdrawal.amount,
      currency: withdrawal.currency,
      requestedAt: withdrawal.createdAt,
    });

    return withdrawal;
  }

  private isBankAccountComplete(bankAccount: User['bankAccount'] | undefined): boolean {
    return !!bankAccount && REQUIRED_BANK_FIELDS.every((field) => !!bankAccount?.[field]);
  }

  async findForUser(userId: string, pagination: WithdrawalPaginationDto) {
    const { limit = 10, offset = 0, status } = pagination;
    const [data, total] = await this.withdrawalRepo.findAndCount({
      where: { user: { id: userId }, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOneForUser(id: string, userId: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.findByIdOrThrow(id);
    if (withdrawal.user?.id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud de retiro');
    }
    return withdrawal;
  }

  async findForOrganization(organizationId: string, pagination: WithdrawalPaginationDto) {
    const { limit = 10, offset = 0, status } = pagination;
    const [data, total] = await this.withdrawalRepo.findAndCount({
      where: { beneficiaryOrganization: { id: organizationId }, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOneForOrganization(id: string, organizationId: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.findByIdOrThrow(id);
    if (withdrawal.beneficiaryOrganization?.id !== organizationId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud de retiro');
    }
    return withdrawal;
  }

  async findAllAdmin(pagination: WithdrawalPaginationDto) {
    const { limit = 10, offset = 0, status, userId } = pagination;
    const [data, total] = await this.withdrawalRepo.findAndCount({
      where: { ...(status ? { status } : {}), ...(userId ? { user: { id: userId } } : {}) },
      relations: ['user', 'beneficiaryOrganization', 'processedByAdmin'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async findOneAdmin(id: string): Promise<WalletWithdrawal> {
    return this.findByIdOrThrow(id);
  }

  async markInProcess(id: string, adminId: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.findByIdOrThrow(id);
    this.assertTransition(withdrawal.status, WalletWithdrawalStatus.IN_PROCESS);

    withdrawal.status = WalletWithdrawalStatus.IN_PROCESS;
    withdrawal.inProcessAt = new Date();
    withdrawal.processedByAdmin = { id: adminId } as User;
    return this.withdrawalRepo.save(withdrawal);
  }

  async markPaid(id: string, adminId: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.findByIdOrThrow(id);
    this.assertTransition(withdrawal.status, WalletWithdrawalStatus.PAID);

    withdrawal.status = WalletWithdrawalStatus.PAID;
    withdrawal.paidAt = new Date();
    withdrawal.processedByAdmin = { id: adminId } as User;
    withdrawal.notificationAttempts = 0;
    withdrawal.notifiedAt = null;
    const saved = await this.withdrawalRepo.save(withdrawal);

    this.eventBus.emit('wallet.withdrawal.paid', {
      withdrawalId: saved.id,
      userId: withdrawal.user?.id ?? '',
      userEmail: withdrawal.user?.email ?? '',
      userName: withdrawal.user ? `${withdrawal.user.name} ${withdrawal.user.lastName}` : '',
      amount: saved.amount,
      paidAt: saved.paidAt as Date,
    });

    return saved;
  }

  /**
   * Marca varias solicitudes como pagadas en lote (checkboxes del panel
   * admin). Cada una se procesa de forma aislada reutilizando {@link markPaid}
   * (misma validación de transición + evento de notificación); una que falle
   * (ya pagada/rechazada, no encontrada) no detiene al resto.
   */
  async payBatch(
    ids: string[],
    adminId: string,
  ): Promise<{ paid: WalletWithdrawal[]; failed: { id: string; reason: string }[] }> {
    const paid: WalletWithdrawal[] = [];
    const failed: { id: string; reason: string }[] = [];

    for (const id of ids) {
      try {
        paid.push(await this.markPaid(id, adminId));
      } catch (error: any) {
        failed.push({ id, reason: error?.message ?? 'Error desconocido' });
      }
    }

    return { paid, failed };
  }

  async reject(id: string, adminId: string, reason: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.findByIdOrThrow(id);
    this.assertTransition(withdrawal.status, WalletWithdrawalStatus.REJECTED);

    withdrawal.status = WalletWithdrawalStatus.REJECTED;
    withdrawal.rejectedAt = new Date();
    withdrawal.rejectionReason = reason;
    withdrawal.processedByAdmin = { id: adminId } as User;
    withdrawal.notificationAttempts = 0;
    withdrawal.notifiedAt = null;
    const saved = await this.withdrawalRepo.save(withdrawal);

    this.eventBus.emit('wallet.withdrawal.rejected', {
      withdrawalId: saved.id,
      userId: withdrawal.user?.id ?? '',
      userEmail: withdrawal.user?.email ?? '',
      userName: withdrawal.user ? `${withdrawal.user.name} ${withdrawal.user.lastName}` : '',
      amount: saved.amount,
      reason,
      rejectedAt: saved.rejectedAt as Date,
    });

    return saved;
  }

  private async findByIdOrThrow(id: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id },
      relations: ['user', 'beneficiaryOrganization', 'processedByAdmin'],
    });
    if (!withdrawal) throw new NotFoundException('Solicitud de retiro no encontrada');
    return withdrawal;
  }

  private assertTransition(current: WalletWithdrawalStatus, next: WalletWithdrawalStatus): void {
    const terminal = [WalletWithdrawalStatus.PAID, WalletWithdrawalStatus.REJECTED];
    if (terminal.includes(current)) {
      throw new BadRequestException(`La solicitud ya está en un estado final (${current}) y no puede modificarse`);
    }
    if (next === WalletWithdrawalStatus.IN_PROCESS && current !== WalletWithdrawalStatus.PENDING) {
      throw new BadRequestException('Solo una solicitud pendiente puede pasar a "en proceso"');
    }
  }
}
