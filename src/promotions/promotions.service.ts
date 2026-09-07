import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationType } from '../organizations/entities/organization-type.enum';
import { RosterMembership } from '../organizations/entities/roster-membership.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { MembershipStatus } from '../organizations/entities/membership-status.enum';
import { Track } from '../tracks/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { EventBusService } from '../shared/events/event-bus.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payments/domain/payment-provider.interface';
import { Promotion } from './entities/promotion.entity';
import { PromotionType } from './entities/promotion-type.enum';
import { PromotionStatus } from './entities/promotion-status.enum';
import { PromotionPaymentStatus } from './entities/promotion-payment-status.enum';
import { PromotionSlotService } from './promotion-slot.service';
import { PromotionPricingConfigService } from './promotion-pricing-config.service';
import { canTransition } from './promotion-state-machine';
import {
  PROMOTION_CURRENCY,
  PROMOTION_DURATION_DAYS,
  PromotionErrorCode,
} from './promotions.constants';

interface CreatePromotionInput {
  type: PromotionType;
  targetId: string;
}

/** Vista enriquecida de una pauta con datos del recurso y del solicitante. */
export interface PromotionView extends Promotion {
  resource: { title: string; imageUrl?: string | null; subtitle?: string | null } | null;
  requester: { id: string; name: string; email: string } | null;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(RosterMembership)
    private readonly rosterRepo: Repository<RosterMembership>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(Track)
    private readonly trackRepo: Repository<Track>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
    private readonly slotService: PromotionSlotService,
    private readonly pricingService: PromotionPricingConfigService,
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** URL de la web app según el entorno (para el redirect del Widget). */
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

  // ─── Publisher: crear solicitud ────────────────────────────────────────────

  /**
   * Crea una solicitud de pauta en estado PENDING_PAYMENT. Valida que la
   * organización sea un publisher activo y que el recurso pertenezca a su
   * roster. Devuelve la pauta + una previsualización de fecha de publicación.
   */
  async createPromotion(actorUserId: string, organizationId: string, dto: CreatePromotionInput) {
    await this.assertPublisher(organizationId);
    await this.assertActorMembership(organizationId, actorUserId);
    await this.assertResourceInRoster(organizationId, dto.type, dto.targetId);
    await this.assertNoLiveDuplicate(dto.type, dto.targetId);

    const price = await this.pricingService.getCurrent(dto.type);
    const preview = await this.slotService.previewSchedule(dto.type);

    let promotion: Promotion;
    try {
      promotion = await this.promotionRepo.save(
        this.promotionRepo.create({
          type: dto.type,
          targetId: dto.targetId,
          organizationId,
          requestedByUserId: actorUserId,
          status: PromotionStatus.PENDING_PAYMENT,
          priceAmount: Number(price.amount),
          currency: price.currency ?? PROMOTION_CURRENCY,
          paymentStatus: PromotionPaymentStatus.NONE,
        }),
      );
    } catch (err) {
      // El índice único parcial cubre la carrera contra `assertNoLiveDuplicate`.
      throw new ConflictException({
        message: 'Ya existe una pauta activa para este recurso',
        code: PromotionErrorCode.DUPLICATE_ACTIVE_PROMOTION,
      });
    }

    return { promotion, preview, price: Number(price.amount), currency: price.currency };
  }

  // ─── Publisher: checkout (Widget de la pasarela) ───────────────────────────

  /**
   * Genera los parámetros del Widget de pago para una pauta pendiente. Reutiliza
   * el proveedor de pago activo (misma firma de integridad que las licencias).
   */
  async createCheckout(actorUserId: string, organizationId: string, promotionId: string) {
    await this.assertActorMembership(organizationId, actorUserId);
    const promotion = await this.getOwnedPromotion(promotionId, organizationId);

    if (promotion.status !== PromotionStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Esta pauta no está pendiente de pago');
    }

    const amountInCents = Math.round(Number(promotion.priceAmount) * 100);
    if (amountInCents <= 0) {
      throw new BadRequestException('El precio de la pauta no está configurado correctamente');
    }

    const reference = randomUUID();
    let signature: string;
    try {
      signature = this.paymentProvider.generateIntegritySignature({
        reference,
        amountInCents,
        currency: PROMOTION_CURRENCY,
      });
    } catch (err) {
      this.logger.error(`[promotion checkout] error generando firma: ${(err as Error)?.message}`);
      throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');
    }

    const publicKey = this.configService.get<string>('WOMPI_PUBLIC_KEY', '');
    if (!publicKey) throw new ServiceUnavailableException('No se pudo iniciar el proceso de pago.');

    promotion.paymentReference = reference;
    promotion.paymentStatus = PromotionPaymentStatus.PENDING;
    await this.promotionRepo.save(promotion);

    const redirectUrl = `${this.webAppUrl()}/org/${organizationId}/promociones?ref=${reference}`;

    return {
      widget: { publicKey, currency: PROMOTION_CURRENCY, amountInCents, reference, signature, redirectUrl },
      externalReference: reference,
      total: amountInCents / 100,
    };
  }

  // ─── Webhook de pago (llamado vía evento payment.webhook.unmatched) ────────

  /**
   * Procesa la confirmación de pago de una pauta. Idempotente: solo transiciona
   * si la pauta está PENDING_PAYMENT. Un pago aprobado la lleva a IN_REVIEW y
   * notifica al administrador.
   */
  async handlePromotionPayment(parsed: {
    reference: string;
    status: string;
    transactionId?: string;
  }): Promise<boolean> {
    const promotion = await this.promotionRepo.findOne({
      where: { paymentReference: parsed.reference },
    });
    if (!promotion) return false;

    const approved = String(parsed.status).toUpperCase() === 'APPROVED';

    if (!approved) {
      if (promotion.paymentStatus !== PromotionPaymentStatus.APPROVED) {
        promotion.paymentStatus = PromotionPaymentStatus.DECLINED;
        await this.promotionRepo.save(promotion);
      }
      return true;
    }

    if (promotion.status !== PromotionStatus.PENDING_PAYMENT) {
      // Ya procesada (idempotencia).
      return true;
    }

    promotion.paymentStatus = PromotionPaymentStatus.APPROVED;
    promotion.status = PromotionStatus.IN_REVIEW;
    await this.promotionRepo.save(promotion);

    this.logger.log(`[promotion] pago confirmado ref=${parsed.reference} promotion=${promotion.id}`);
    this.eventBus.emit('promotion.submitted', await this.buildEventPayload(promotion));
    return true;
  }

  // ─── Admin: aprobar / rechazar ─────────────────────────────────────────────

  /**
   * Aprueba una pauta en revisión. Bloquea la doble aprobación con un UPDATE
   * condicional atómico (WHERE status = IN_REVIEW). Calcula fecha de inicio/fin
   * y la deja PROGRAMADA (la publica el cron cuando corresponda).
   */
  async approve(promotionId: string, adminUserId: string) {
    const promotion = await this.promotionRepo.findOne({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundException('Pauta no encontrada');
    if (promotion.status !== PromotionStatus.IN_REVIEW) {
      throw new ConflictException('La pauta no está en revisión');
    }

    const preview = await this.slotService.previewSchedule(promotion.type);
    const now = new Date();

    const result = await this.dataSource
      .getRepository(Promotion)
      .createQueryBuilder()
      .update(Promotion)
      .set({
        status: PromotionStatus.SCHEDULED,
        approvedByUserId: adminUserId,
        approvedAt: now,
        startsAt: preview.startsAt,
        expiresAt: preview.expiresAt,
      })
      .where('id = :id AND status = :status', { id: promotionId, status: PromotionStatus.IN_REVIEW })
      .execute();

    if (!result.affected) {
      throw new ConflictException('La pauta ya fue procesada por otro administrador');
    }

    const updated = await this.promotionRepo.findOneOrFail({ where: { id: promotionId } });
    this.eventBus.emit('promotion.approved', await this.buildEventPayload(updated));
    return updated;
  }

  /** Rechaza una pauta en revisión, registrando el motivo. */
  async reject(promotionId: string, adminUserId: string, reason: string) {
    const promotion = await this.promotionRepo.findOne({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundException('Pauta no encontrada');
    if (promotion.status !== PromotionStatus.IN_REVIEW) {
      throw new ConflictException('La pauta no está en revisión');
    }

    const result = await this.dataSource
      .getRepository(Promotion)
      .createQueryBuilder()
      .update(Promotion)
      .set({
        status: PromotionStatus.REJECTED,
        approvedByUserId: adminUserId,
        rejectionReason: reason,
      })
      .where('id = :id AND status = :status', { id: promotionId, status: PromotionStatus.IN_REVIEW })
      .execute();

    if (!result.affected) {
      throw new ConflictException('La pauta ya fue procesada por otro administrador');
    }

    const updated = await this.promotionRepo.findOneOrFail({ where: { id: promotionId } });
    this.eventBus.emit('promotion.rejected', await this.buildEventPayload(updated));
    return updated;
  }

  /** Retira una pauta viva (publisher o admin). */
  async withdraw(promotionId: string, organizationId: string | null, actorUserId?: string) {
    if (organizationId && actorUserId) {
      await this.assertActorMembership(organizationId, actorUserId);
    }
    const promotion = organizationId
      ? await this.getOwnedPromotion(promotionId, organizationId)
      : await this.promotionRepo.findOne({ where: { id: promotionId } });

    if (!promotion) throw new NotFoundException('Pauta no encontrada');
    if (!canTransition(promotion.status, PromotionStatus.WITHDRAWN)) {
      throw new ConflictException({
        message: 'La pauta no puede retirarse en su estado actual',
        code: PromotionErrorCode.INVALID_STATE_TRANSITION,
      });
    }

    promotion.status = PromotionStatus.WITHDRAWN;
    promotion.withdrawnAt = new Date();
    return this.promotionRepo.save(promotion);
  }

  // ─── Recursos pautables (Flow 1.1) ─────────────────────────────────────────

  /**
   * Recursos que el publisher puede pautar: compositores de su roster activo y
   * los tracks de esos compositores. Marca los que ya tienen una pauta viva para
   * que la UI los deshabilite (idempotencia visible).
   */
  async listPromotableResources(organizationId: string, actorUserId: string) {
    await this.assertPublisher(organizationId);
    await this.assertActorMembership(organizationId, actorUserId);

    const roster = await this.rosterRepo.find({
      where: { organizationId, status: MembershipStatus.ACTIVE },
    });
    const composerIds = roster.map((r) => r.userId);

    if (composerIds.length === 0) {
      return { composers: [], tracks: [] };
    }

    const [composers, tracks, livePromotions] = await Promise.all([
      this.userRepo.find({ where: { id: In(composerIds) }, relations: ['preferredGenres'] }),
      this.trackRepo
        .createQueryBuilder('track')
        .leftJoinAndSelect('track.authors', 'author')
        .leftJoinAndSelect('track.genre', 'genre')
        .where('author.id IN (:...composerIds)', { composerIds })
        .getMany(),
      this.promotionRepo.find({
        where: {
          status: In([
            PromotionStatus.PENDING_PAYMENT,
            PromotionStatus.IN_REVIEW,
            PromotionStatus.APPROVED,
            PromotionStatus.SCHEDULED,
            PromotionStatus.ACTIVE,
          ]),
        },
        select: { type: true, targetId: true },
      }),
    ]);

    const liveTargets = new Set(livePromotions.map((p) => `${p.type}:${p.targetId}`));

    return {
      composers: composers.map((u) => ({
        id: u.id,
        name: [u.name, (u as { lastName?: string }).lastName].filter(Boolean).join(' ').trim() || u.name,
        avatarUrl: u.avatarUrl ?? null,
        genre: u.preferredGenres?.[0]?.genre ?? null,
        alreadyPromoted: liveTargets.has(`${PromotionType.COMPOSER}:${u.id}`),
      })),
      tracks: tracks.map((t) => ({
        id: t.id,
        title: t.title,
        coverUrl: t.coverUrl ?? null,
        author: (t.authors ?? []).map((a) => a.name).join(', ') || null,
        genre: t.genre?.genre ?? null,
        alreadyPromoted: liveTargets.has(`${PromotionType.TRACK}:${t.id}`),
      })),
    };
  }

  // ─── Listados ──────────────────────────────────────────────────────────────

  /** Pautas de un publisher, opcionalmente filtradas por estado. */
  async listByOrganization(
    organizationId: string,
    actorUserId: string,
    statuses?: PromotionStatus[],
  ) {
    await this.assertActorMembership(organizationId, actorUserId);
    const promotions = await this.promotionRepo.find({
      where: { organizationId, ...(statuses?.length ? { status: In(statuses) } : {}) },
      order: { createdAt: 'DESC' },
    });
    return this.hydrate(promotions);
  }

  /** Listado admin con filtros por estado/tipo. */
  async listForAdmin(filters: { status?: PromotionStatus; type?: PromotionType }) {
    const promotions = await this.promotionRepo.find({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
      },
      order: { createdAt: 'DESC' },
    });
    return this.hydrate(promotions);
  }

  // ─── Validaciones privadas ───────────────────────────────────────────────

  private async assertPublisher(organizationId: string): Promise<Organization> {
    const org = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!org || !org.isActive) {
      throw new NotFoundException('Organización no encontrada o inactiva');
    }
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new ForbiddenException({
        message: 'La gestión de pautas solo está disponible para organizaciones publisher',
        code: PromotionErrorCode.ORGANIZATION_NOT_PUBLISHER,
      });
    }
    return org;
  }

  /** Verifica que el actor sea miembro ACTIVO de la organización. */
  private async assertActorMembership(organizationId: string, userId: string): Promise<void> {
    const membership = await this.membershipRepo.findOne({
      where: { organizationId, userId, status: MembershipStatus.ACTIVE },
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a esta organización');
    }
  }

  /**
   * Verifica que el recurso pertenezca al roster del publisher: para COMPOSER,
   * que el usuario destino sea miembro activo del roster; para TRACK, que alguno
   * de los autores lo sea. Recurso ajeno/inexistente → 403/404.
   */
  private async assertResourceInRoster(
    organizationId: string,
    type: PromotionType,
    targetId: string,
  ): Promise<void> {
    if (type === PromotionType.COMPOSER) {
      const membership = await this.rosterRepo.findOne({
        where: { organizationId, userId: targetId, status: MembershipStatus.ACTIVE },
      });
      if (!membership) {
        throw new ForbiddenException({
          message: 'El compositor no pertenece al roster de esta organización',
          code: PromotionErrorCode.RESOURCE_NOT_IN_ROSTER,
        });
      }
      return;
    }

    const track = await this.trackRepo.findOne({
      where: { id: targetId },
      relations: ['authors'],
    });
    if (!track) throw new NotFoundException('Track no encontrado');

    const authorIds = (track.authors ?? []).map((a) => a.id);
    if (authorIds.length === 0) {
      throw new ForbiddenException({
        message: 'El track no pertenece al roster de esta organización',
        code: PromotionErrorCode.RESOURCE_NOT_IN_ROSTER,
      });
    }

    const rosterMatch = await this.rosterRepo.count({
      where: { organizationId, userId: In(authorIds), status: MembershipStatus.ACTIVE },
    });
    if (rosterMatch === 0) {
      throw new ForbiddenException({
        message: 'El track no pertenece al roster de esta organización',
        code: PromotionErrorCode.RESOURCE_NOT_IN_ROSTER,
      });
    }
  }

  private async assertNoLiveDuplicate(type: PromotionType, targetId: string): Promise<void> {
    const existing = await this.promotionRepo.findOne({
      where: {
        type,
        targetId,
        status: In([
          PromotionStatus.PENDING_PAYMENT,
          PromotionStatus.IN_REVIEW,
          PromotionStatus.APPROVED,
          PromotionStatus.SCHEDULED,
          PromotionStatus.ACTIVE,
        ]),
      },
    });
    if (existing) {
      throw new ConflictException({
        message: 'Ya existe una pauta activa o en curso para este recurso',
        code: PromotionErrorCode.DUPLICATE_ACTIVE_PROMOTION,
      });
    }
  }

  private async getOwnedPromotion(promotionId: string, organizationId: string): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({ where: { id: promotionId } });
    if (!promotion) throw new NotFoundException('Pauta no encontrada');
    if (promotion.organizationId !== organizationId) {
      throw new ForbiddenException('La pauta no pertenece a esta organización');
    }
    return promotion;
  }

  // ─── Hidratación y payloads de evento ──────────────────────────────────────

  /** Enriquece pautas con datos del recurso (track/compositor) y del solicitante. */
  private async hydrate(promotions: Promotion[]): Promise<PromotionView[]> {
    if (promotions.length === 0) return [];

    const trackIds = promotions.filter((p) => p.type === PromotionType.TRACK).map((p) => p.targetId);
    const composerIds = promotions
      .filter((p) => p.type === PromotionType.COMPOSER)
      .map((p) => p.targetId);
    const requesterIds = promotions.map((p) => p.requestedByUserId);

    const [tracks, composers, requesters] = await Promise.all([
      trackIds.length
        ? this.trackRepo.find({ where: { id: In(trackIds) }, relations: ['authors', 'genre'] })
        : Promise.resolve([]),
      composerIds.length
        ? this.userRepo.find({ where: { id: In(composerIds) }, relations: ['preferredGenres'] })
        : Promise.resolve([]),
      requesterIds.length
        ? this.userRepo.find({ where: { id: In(requesterIds) } })
        : Promise.resolve([]),
    ]);

    const trackMap = new Map(tracks.map((t) => [t.id, t]));
    const composerMap = new Map(composers.map((u) => [u.id, u]));
    const requesterMap = new Map(requesters.map((u) => [u.id, u]));

    return promotions.map((p) => {
      let resource: PromotionView['resource'] = null;
      if (p.type === PromotionType.TRACK) {
        const t = trackMap.get(p.targetId);
        if (t) {
          resource = {
            title: t.title,
            imageUrl: t.coverUrl ?? null,
            subtitle: (t.authors ?? []).map((a) => a.name).join(', ') || null,
          };
        }
      } else {
        const u = composerMap.get(p.targetId);
        if (u) {
          resource = {
            title: [u.name, (u as any).lastName].filter(Boolean).join(' ').trim() || u.name,
            imageUrl: u.avatarUrl ?? null,
            subtitle: (u as any).preferredGenres?.[0]?.genre ?? null,
          };
        }
      }

      const r = requesterMap.get(p.requestedByUserId);
      return {
        ...p,
        resource,
        requester: r ? { id: r.id, name: r.name, email: r.email } : null,
      } as PromotionView;
    });
  }

  /** Payload común para los eventos de notificación de una pauta. */
  private async buildEventPayload(promotion: Promotion) {
    const [view] = await this.hydrate([promotion]);
    return {
      promotionId: promotion.id,
      type: promotion.type,
      targetId: promotion.targetId,
      organizationId: promotion.organizationId,
      requesterId: promotion.requestedByUserId,
      status: promotion.status,
      resourceTitle: view?.resource?.title ?? 'tu recurso',
      rejectionReason: promotion.rejectionReason ?? null,
      startsAt: promotion.startsAt ?? null,
      expiresAt: promotion.expiresAt ?? null,
    };
  }

  /** Días de publicación configurados (reexport para consumidores externos). */
  get durationDays(): number {
    return PROMOTION_DURATION_DAYS;
  }
}
