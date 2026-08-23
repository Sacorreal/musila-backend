import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { BANK_TRANSFER_PROVIDER, BankTransferProvider } from 'src/payments/domain/bank-transfer-provider.interface';
import { TransferOptionsResult } from 'src/payments/domain/bank-transfer-provider.types';
import { UserBankInformation } from './entities/user-bank-information.entity';
import { BankInformationRequest } from './entities/bank-information-request.entity';
import { BankInformationRequestStatus, BankInformationCompletionReason } from './entities/bank-information-request-status.enum';
import { BankInformationMethod } from './entities/bank-information-method.enum';
import { BankAccountCipherService } from './crypto/bank-account-cipher.service';
import { CreateColombiaBankInformationDto } from './dto/create-colombia-bank-information.dto';
import { CreateForeignBankInformationDto } from './dto/create-foreign-bank-information.dto';
import { BankInformationResponseDto, PendingBankInformationStatusDto } from './dto/bank-information-response.dto';

@Injectable()
export class BankInformationService {
  constructor(
    @Inject(BANK_TRANSFER_PROVIDER)
    private readonly bankTransferProvider: BankTransferProvider,
    @InjectRepository(UserBankInformation)
    private readonly userBankInformationRepo: Repository<UserBankInformation>,
    @InjectRepository(BankInformationRequest)
    private readonly requestRepo: Repository<BankInformationRequest>,
    private readonly cipher: BankAccountCipherService,
    private readonly eventBus: EventBusService,
  ) {}

  async getTransferOptions(): Promise<TransferOptionsResult> {
    const [banks, accountTypes, documentTypes] = await Promise.all([
      this.bankTransferProvider.listBanks(),
      Promise.resolve(this.bankTransferProvider.listAccountTypes()),
      Promise.resolve(this.bankTransferProvider.listDocumentTypes()),
    ]);
    return { banks, accountTypes, documentTypes };
  }

  async getPendingStatus(userId: string): Promise<PendingBankInformationStatusDto> {
    const request = await this.requestRepo.findOne({
      where: { user: { id: userId }, status: BankInformationRequestStatus.PENDING },
      relations: ['licenseContract'],
      order: { createdAt: 'DESC' },
    });

    if (!request) return { pending: false };

    return {
      pending: true,
      request: {
        requestId: request.id,
        contractId: request.licenseContract.id,
        trackTitle: request.trackTitle,
        advanceAmount: Number(request.advanceAmount),
      },
    };
  }

  async getMyBankInformation(userId: string): Promise<BankInformationResponseDto | null> {
    const profile = await this.userBankInformationRepo.findOne({ where: { user: { id: userId } } });
    if (!profile) return null;

    return {
      method: profile.method,
      data: JSON.parse(this.cipher.decrypt(profile.encryptedPayload)),
      legalNoticeAcceptedAt: profile.legalNoticeAcceptedAt,
      updatedAt: profile.updatedAt,
    };
  }

  async saveColombia(userId: string, dto: CreateColombiaBankInformationDto): Promise<BankInformationResponseDto> {
    const { requestId: _requestId, ...payload } = dto;
    const profile = await this.upsertProfile(userId, BankInformationMethod.WOMPI_COLOMBIA, payload, null);
    await this.completeAllPendingRequests(userId, BankInformationCompletionReason.SUBMITTED);
    this.emitCompleted(userId, profile.method);

    return {
      method: profile.method,
      data: payload,
      legalNoticeAcceptedAt: profile.legalNoticeAcceptedAt,
      updatedAt: profile.updatedAt,
    };
  }

  async saveForeign(userId: string, dto: CreateForeignBankInformationDto): Promise<BankInformationResponseDto> {
    const { requestId: _requestId, acceptedLegalNotice: _acceptedLegalNotice, ...payload } = dto;
    const profile = await this.upsertProfile(
      userId,
      BankInformationMethod.GLOBAL66_INTERNATIONAL,
      payload,
      new Date(),
    );
    await this.completeAllPendingRequests(userId, BankInformationCompletionReason.SUBMITTED);
    this.emitCompleted(userId, profile.method);

    return {
      method: profile.method,
      data: payload,
      legalNoticeAcceptedAt: profile.legalNoticeAcceptedAt,
      updatedAt: profile.updatedAt,
    };
  }

  private async upsertProfile(
    userId: string,
    method: BankInformationMethod,
    payload: Record<string, unknown>,
    legalNoticeAcceptedAt: Date | null,
  ): Promise<UserBankInformation> {
    const encryptedPayload = this.cipher.encrypt(JSON.stringify(payload));
    let profile = await this.userBankInformationRepo.findOne({ where: { user: { id: userId } } });

    if (profile) {
      profile.method = method;
      profile.encryptedPayload = encryptedPayload;
      profile.legalNoticeAcceptedAt = legalNoticeAcceptedAt ?? profile.legalNoticeAcceptedAt;
    } else {
      profile = this.userBankInformationRepo.create({
        user: { id: userId } as any,
        method,
        encryptedPayload,
        legalNoticeAcceptedAt,
      });
    }

    return this.userBankInformationRepo.save(profile);
  }

  private async completeAllPendingRequests(
    userId: string,
    reason: BankInformationCompletionReason,
  ): Promise<void> {
    await this.requestRepo.update(
      { user: { id: userId }, status: BankInformationRequestStatus.PENDING },
      { status: BankInformationRequestStatus.COMPLETED, completionReason: reason, completedAt: new Date() },
    );
  }

  private emitCompleted(userId: string, method: BankInformationMethod): void {
    this.eventBus.emit('wallet.bank_information.completed', {
      requestId: null,
      contractId: null,
      userId,
      method,
    });
  }
}
