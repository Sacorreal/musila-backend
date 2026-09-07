import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { User } from 'src/users/entities/user.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { UserBankInformation } from '../entities/user-bank-information.entity';
import { BankInformationRequest } from '../entities/bank-information-request.entity';
import {
  BankInformationCompletionReason,
  BankInformationRequestStatus,
} from '../entities/bank-information-request-status.enum';
import { BankInformationNotificationService } from '../services/bank-information-notification.service';

/**
 * Reacciona a `wallet.bank_information.requested` (emitido al firmar un
 * contrato con anticipo > 0): por cada participante del Split crea el
 * registro de control y, si aún no tiene información bancaria configurada,
 * dispara la notificación. Si ya la tiene, el registro se crea directamente
 * `COMPLETED` sin notificar (Flow 1 + Flow 4).
 */
@Injectable()
export class BankInformationRequestListener {
  private readonly logger = new Logger(BankInformationRequestListener.name);

  constructor(
    @InjectRepository(UserBankInformation)
    private readonly userBankInformationRepo: Repository<UserBankInformation>,
    @InjectRepository(BankInformationRequest)
    private readonly requestRepo: Repository<BankInformationRequest>,
    private readonly notificationService: BankInformationNotificationService,
  ) {}

  @EventListener({ event: 'wallet.bank_information.requested', channel: 'in-app' })
  async handleRequested(payload: AppEventMap['wallet.bank_information.requested']) {
    for (const participant of payload.participants) {
      try {
        await this.handleParticipant(payload, participant);
      } catch (error) {
        this.logger.error(
          `Error procesando solicitud de información bancaria para ${participant.userId} (contrato ${payload.contractId})`,
          error,
        );
      }
    }
  }

  private async handleParticipant(
    payload: AppEventMap['wallet.bank_information.requested'],
    participant: { userId: string; name: string; email: string },
  ): Promise<void> {
    const existingProfile = await this.userBankInformationRepo.findOne({
      where: { user: { id: participant.userId } },
    });

    const request = this.requestRepo.create({
      user: { id: participant.userId } as User,
      licenseContract: { id: payload.contractId } as LicenseContract,
      trackTitle: payload.trackTitle,
      advanceAmount: payload.advanceAmount,
      status: existingProfile ? BankInformationRequestStatus.COMPLETED : BankInformationRequestStatus.PENDING,
      completionReason: existingProfile ? BankInformationCompletionReason.ALREADY_CONFIGURED : null,
      completedAt: existingProfile ? new Date() : null,
    });

    let saved: BankInformationRequest;
    try {
      saved = await this.requestRepo.save(request);
    } catch (error) {
      // UNIQUE(user, licenseContract): el evento ya fue procesado para este
      // participante — idempotencia ante reemisión del evento.
      if (error instanceof QueryFailedError) return;
      throw error;
    }

    if (!existingProfile) {
      saved.licenseContract = request.licenseContract;
      await this.notificationService.notifyRequested(saved, participant);
    }
  }
}
