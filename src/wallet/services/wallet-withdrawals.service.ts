import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { WalletWithdrawal } from '../entities/wallet-withdrawal.entity';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
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
  constructor(
    @InjectRepository(WalletWithdrawal)
    private readonly withdrawalRepo: Repository<WalletWithdrawal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly earningsService: WalletEarningsService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(userId: string, dto: CreateWithdrawalDto): Promise<WalletWithdrawal> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isBankAccountComplete =
      !!user.bankAccount && REQUIRED_BANK_FIELDS.every((field) => !!user.bankAccount?.[field]);
    if (!isBankAccountComplete) {
      throw new BadRequestException('Debes completar tus datos bancarios antes de solicitar un retiro');
    }

    const { availableBalance, currency } = await this.earningsService.getBalance(userId);
    if (dto.amount > availableBalance) {
      throw new BadRequestException('El monto solicitado supera tu saldo disponible');
    }

    const withdrawal = await this.withdrawalRepo.save({
      user,
      amount: dto.amount,
      currency,
      status: WalletWithdrawalStatus.PENDING,
      bankAccountSnapshot: user.bankAccount,
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
    if (withdrawal.user.id !== userId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud de retiro');
    }
    return withdrawal;
  }

  async findAllAdmin(pagination: WithdrawalPaginationDto) {
    const { limit = 10, offset = 0, status, userId } = pagination;
    const [data, total] = await this.withdrawalRepo.findAndCount({
      where: { ...(status ? { status } : {}), ...(userId ? { user: { id: userId } } : {}) },
      relations: ['user', 'processedByAdmin'],
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
      userId: withdrawal.user.id,
      userEmail: withdrawal.user.email,
      userName: `${withdrawal.user.name} ${withdrawal.user.lastName}`,
      amount: saved.amount,
      paidAt: saved.paidAt as Date,
    });

    return saved;
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
      userId: withdrawal.user.id,
      userEmail: withdrawal.user.email,
      userName: `${withdrawal.user.name} ${withdrawal.user.lastName}`,
      amount: saved.amount,
      reason,
      rejectedAt: saved.rejectedAt as Date,
    });

    return saved;
  }

  private async findByIdOrThrow(id: string): Promise<WalletWithdrawal> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id },
      relations: ['user', 'processedByAdmin'],
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
