import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { LicenseCollection } from './entities/license-collection.entity';
import { CollectionStatus } from './entities/collection-status.enum';
import { CollectionChannel } from './entities/collection-channel.enum';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { RequestsStatus } from 'src/requested-tracks/entities/requests-status.enum';
import { LicenseType } from 'src/requested-tracks/entities/license-type.enum';
import { LicensePaymentStatus } from 'src/requested-tracks/entities/license-payment-status.enum';
import { CreateLicenseCollectionDto } from './dto/create-license-collection.dto';
import { LicenseCollectionPaginationDto } from './dto/license-collection-pagination.dto';
import { PaymentLinkTokenService } from './services/payment-link-token.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { EmailService } from 'src/shared/mail/services/email.service';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

const DEFAULT_MAX_SEND_ATTEMPTS = 3;
const ACTIVE_STATUSES = [CollectionStatus.PENDIENTE, CollectionStatus.ENLACE_ENVIADO];
const collectionRelations = [
  'requestedTrack',
  'requestedTrack.requester',
  'requestedTrack.track',
  'licenseContract',
];

@Injectable()
export class LicenseCollectionsService {
  private readonly logger = new Logger(LicenseCollectionsService.name);
  private readonly maxSendAttempts: number;

  constructor(
    @InjectRepository(LicenseCollection)
    private readonly collectionRepo: Repository<LicenseCollection>,
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    private readonly tokenService: PaymentLinkTokenService,
    private readonly eventBus: EventBusService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly legalProofService: LegalProofService,
  ) {
    this.maxSendAttempts = this.configService.get<number>(
      'LICENSE_COLLECTION_MAX_SEND_ATTEMPTS',
      DEFAULT_MAX_SEND_ATTEMPTS,
    );
  }

  private webAppUrl(): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'local');
    const key =
      nodeEnv === 'production'
        ? 'WEB_APP_PRODUCTION'
        : nodeEnv === 'development'
          ? 'WEB_APP_DEVELOPMENT'
          : 'WEB_APP_LOCAL';
    return this.configService.get<string>(key, 'http://localhost:3000');
  }

  private async findWithRelations(id: string): Promise<LicenseCollection> {
    const collection = await this.collectionRepo.findOne({
      where: { id },
      relations: collectionRelations,
    });
    if (!collection) throw new NotFoundException('El cobro no existe');
    return collection;
  }

  async create(dto: CreateLicenseCollectionDto): Promise<LicenseCollection> {
    const requestedTrack = await this.requestedTrackRepo.findOne({
      where: { id: dto.requestedTrackId },
      relations: ['requester', 'track'],
    });
    if (!requestedTrack) throw new NotFoundException('La solicitud de licencia no existe');

    if (requestedTrack.licenseType !== LicenseType.LICENCIA_DE_PRIMER_USO) {
      throw new BadRequestException('El cobro de anticipo solo aplica a licencias de primer uso');
    }
    if (requestedTrack.status !== RequestsStatus.PENDIENTE) {
      throw new BadRequestException('Solo se pueden registrar cobros sobre solicitudes pendientes');
    }
    if (requestedTrack.licensePaymentStatus === LicensePaymentStatus.APPROVED) {
      throw new BadRequestException('Esta licencia ya fue pagada');
    }

    const dueDate = new Date(dto.dueDate);
    if (dueDate.getTime() <= Date.now()) {
      throw new BadRequestException('La fecha pactada debe ser futura');
    }

    const existingActive = await this.collectionRepo.findOne({
      where: { requestedTrack: { id: dto.requestedTrackId }, status: In(ACTIVE_STATUSES) },
    });
    if (existingActive) {
      throw new BadRequestException('Ya existe un cobro activo para esta solicitud');
    }

    const collection = this.collectionRepo.create({
      requestedTrack: { id: dto.requestedTrackId },
      amount: dto.amount,
      dueDate,
    });

    const saved = await this.collectionRepo.save(collection);
    return this.findWithRelations(saved.id);
  }

  async findAllPaginated(pagination: LicenseCollectionPaginationDto) {
    const { limit, offset, status, requestedTrackId, dueDateFrom, dueDateTo } = pagination;

    const qb = this.collectionRepo
      .createQueryBuilder('collection')
      .leftJoinAndSelect('collection.requestedTrack', 'requestedTrack')
      .leftJoinAndSelect('requestedTrack.requester', 'requester')
      .leftJoinAndSelect('requestedTrack.track', 'track')
      .orderBy('collection.dueDate', 'DESC')
      .take(limit)
      .skip(offset);

    if (status) qb.andWhere('collection.status = :status', { status });
    if (requestedTrackId) qb.andWhere('requestedTrack.id = :requestedTrackId', { requestedTrackId });
    if (dueDateFrom) qb.andWhere('collection.dueDate >= :dueDateFrom', { dueDateFrom });
    if (dueDateTo) qb.andWhere('collection.dueDate <= :dueDateTo', { dueDateTo });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  async findOne(id: string): Promise<LicenseCollection> {
    return this.findWithRelations(id);
  }

  /** Genera el enlace, lo envía por email + in-app y actualiza el estado del cobro. */
  async attemptSend(id: string): Promise<LicenseCollection> {
    const collection = await this.findWithRelations(id);
    const requester = collection.requestedTrack.requester;
    const trackTitle = collection.requestedTrack.track?.title ?? 'la pista solicitada';

    collection.sendAttempts += 1;
    collection.lastAttemptAt = new Date();

    try {
      const { token, expiresAt } = await this.tokenService.sign({
        collectionId: collection.id,
        requestedTrackId: collection.requestedTrack.id,
      });

      const reference = collection.requestedTrack.licensePaymentReference ?? collection.id;
      const paymentUrl = `${this.webAppUrl()}/music/solicitudes?ref=${reference}`;
      const formattedAmount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(Number(collection.amount));
      const formattedDueDate = collection.dueDate.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      await this.emailService.sendLicenseCollectionPaymentLinkEmail(requester.email, {
        userName: requester.name,
        trackTitle,
        amount: formattedAmount,
        dueDate: formattedDueDate,
        paymentUrl,
      });

      await this.notificationsService.createNotification({
        recipient: { id: requester.id } as any,
        type: 'license.collection.link.sent',
        title: 'Tienes un pago pendiente',
        message: `Tu anticipo de ${formattedAmount} por "${trackTitle}" vence el ${formattedDueDate}. Ingresa para completar el pago.`,
        link: '/music/solicitudes',
        data: { collectionId: collection.id, requestedTrackId: collection.requestedTrack.id },
      });

      collection.status = CollectionStatus.ENLACE_ENVIADO;
      collection.linkToken = token;
      collection.linkExpiresAt = expiresAt;
      collection.linkChannel = CollectionChannel.EMAIL;
      collection.linkSentAt = new Date();
      collection.lastSendError = null;

      await this.collectionRepo.save(collection);

      this.eventBus.emit('license.collection.link.sent', {
        collectionId: collection.id,
        requestedTrackId: collection.requestedTrack.id,
        channel: CollectionChannel.EMAIL,
        sentAt: collection.linkSentAt,
      });

      this.logger.log(`[LicenseCollections] enlace enviado para cobro ${collection.id}`);
    } catch (err: any) {
      collection.lastSendError = err?.message ?? 'Error desconocido';
      await this.collectionRepo.save(collection);

      this.logger.error(
        `[LicenseCollections] fallo enviando enlace para cobro ${collection.id}: ${collection.lastSendError}`,
      );

      if (collection.sendAttempts >= this.maxSendAttempts) {
        this.eventBus.emit('license.collection.send.exhausted', {
          collectionId: collection.id,
          requestedTrackId: collection.requestedTrack.id,
          trackTitle,
          attempts: collection.sendAttempts,
          lastError: collection.lastSendError ?? 'Error desconocido',
        });
      }
    }

    return collection;
  }

  /** Reintento manual desde el panel admin, una vez agotados los reintentos automáticos. */
  async retrySend(id: string): Promise<LicenseCollection> {
    const collection = await this.findWithRelations(id);
    if (collection.status === CollectionStatus.PAGADO) {
      throw new BadRequestException('Este cobro ya fue pagado');
    }

    collection.sendAttempts = 0;
    await this.collectionRepo.save(collection);
    return this.attemptSend(id);
  }

  /** Regenera un nuevo enlace (p. ej. el anterior expiró o el pago fue rechazado). */
  async regenerateLink(id: string): Promise<LicenseCollection> {
    const collection = await this.findWithRelations(id);
    if (collection.status === CollectionStatus.PAGADO) {
      throw new BadRequestException('Este cobro ya fue pagado');
    }

    collection.sendAttempts = 0;
    collection.status = CollectionStatus.PENDIENTE;
    await this.collectionRepo.save(collection);
    return this.attemptSend(id);
  }

  /** Cobros cuya fecha pactada llegó y aún no se ha logrado enviar el enlace. */
  async findDueForSending(): Promise<LicenseCollection[]> {
    return this.collectionRepo.find({
      where: {
        status: CollectionStatus.PENDIENTE,
        dueDate: LessThanOrEqual(new Date()),
        sendAttempts: LessThan(this.maxSendAttempts),
      },
      relations: collectionRelations,
    });
  }

  /** Cobros cuya fecha pactada ya pasó sin registrar pago. */
  async findOverdue(): Promise<LicenseCollection[]> {
    return this.collectionRepo.find({
      where: {
        status: In(ACTIVE_STATUSES),
        dueDate: LessThan(new Date()),
      },
      relations: collectionRelations,
    });
  }

  async markOverdue(collection: LicenseCollection): Promise<void> {
    collection.status = CollectionStatus.EN_MORA;
    collection.overdueAt = new Date();
    await this.collectionRepo.save(collection);

    this.eventBus.emit('license.collection.overdue', {
      collectionId: collection.id,
      requestedTrackId: collection.requestedTrack.id,
      trackTitle: collection.requestedTrack.track?.title ?? 'la pista solicitada',
      dueDate: collection.dueDate,
      licenseContractId: collection.licenseContract?.id,
    });
  }

  /** Se invoca cuando el webhook de Wompi aprueba el pago de la licencia asociada. */
  async markPaidFromRequestedTrack(requestedTrackId: string): Promise<void> {
    const collection = await this.collectionRepo.findOne({
      where: { requestedTrack: { id: requestedTrackId }, status: In(ACTIVE_STATUSES) },
    });
    if (!collection) return;

    collection.status = CollectionStatus.PAGADO;
    collection.paidAt = new Date();
    await this.collectionRepo.save(collection);

    this.logger.log(`[LicenseCollections] cobro ${collection.id} marcado como pagado`);
  }

  /**
   * Crea las N cuotas del anticipo de un `LicenseContract` (flujo "generar en
   * línea"), cada una como su propia fila de `license_collections` numerada
   * secuencialmente. Se ejecuta una sola vez, cuando el contrato queda
   * completamente firmado.
   */
  async createInstallments(
    requestedTrackId: string,
    licenseContractId: string,
    installments: { amount: number; dueDate: Date }[],
  ): Promise<LicenseCollection[]> {
    return this.collectionRepo.manager.transaction(async (manager) => {
      const rows = installments.map((installment, index) =>
        manager.create(LicenseCollection, {
          requestedTrack: { id: requestedTrackId } as RequestedTrack,
          licenseContract: { id: licenseContractId } as any,
          installmentNumber: index + 1,
          amount: installment.amount,
          dueDate: installment.dueDate,
        }),
      );
      return manager.save(LicenseCollection, rows);
    });
  }

  async findByPaymentReference(reference: string): Promise<LicenseCollection | null> {
    return this.collectionRepo.findOne({
      where: { paymentReference: reference },
      relations: collectionRelations,
    });
  }

  async setPaymentReference(collectionId: string, reference: string): Promise<void> {
    await this.collectionRepo.update(collectionId, { paymentReference: reference });
  }

  /** Cuotas asociadas a un contrato, más recientes primero por número de cuota. */
  async findByLicenseContract(licenseContractId: string): Promise<LicenseCollection[]> {
    return this.collectionRepo.find({
      where: { licenseContract: { id: licenseContractId } },
      order: { installmentNumber: 'ASC' },
      relations: collectionRelations,
    });
  }

  /**
   * Marca una cuota puntual como pagada. Si todas las cuotas del contrato
   * asociado quedan pagadas, emite `license.contract.fully_paid` para que el
   * módulo de contratos actualice el estado de pago general.
   */
  async markCollectionPaid(collectionId: string): Promise<void> {
    const collection = await this.findWithRelations(collectionId);
    collection.status = CollectionStatus.PAGADO;
    collection.paidAt = new Date();
    await this.collectionRepo.save(collection);

    this.logger.log(`[LicenseCollections] cuota ${collection.id} marcada como pagada`);

    this.eventBus.emit('license.collection.installment.paid', {
      collectionId: collection.id,
      requestedTrackId: collection.requestedTrack.id,
      licenseContractId: collection.licenseContract?.id ?? null,
      installmentNumber: collection.installmentNumber,
      amount: Number(collection.amount),
      paidAt: collection.paidAt,
    });

    await this.generateInstallmentLegalProof(collection);

    if (!collection.licenseContract) return;

    const siblings = await this.collectionRepo.find({
      where: { licenseContract: { id: collection.licenseContract.id } },
    });
    const allPaid = siblings.every((row) => row.status === CollectionStatus.PAGADO);
    if (!allPaid) return;

    this.eventBus.emit('license.contract.fully_paid', {
      licenseContractId: collection.licenseContract.id,
      requestedTrackId: collection.requestedTrack.id,
    });
  }

  /** Evidencia legal del pago de una cuota/anticipo: hash + timestamp de un snapshot del pago confirmado. */
  private async generateInstallmentLegalProof(collection: LicenseCollection): Promise<void> {
    const snapshot = {
      event: 'license.collection.installment.paid',
      collectionId: collection.id,
      requestedTrackId: collection.requestedTrack.id,
      licenseContractId: collection.licenseContract?.id ?? null,
      installmentNumber: collection.installmentNumber,
      amount: Number(collection.amount),
      paidAt: collection.paidAt,
    };
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const fileName = `license-payment-${collection.id}.json`;

    try {
      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.LICENSE_PAYMENT,
          entityId: collection.id,
          requestedByUserId: collection.requestedTrack.requester?.id,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para el pago ${collection.id}`, error as Error);
    }
  }
}
