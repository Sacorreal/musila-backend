import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import type { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { CollectiveManagementSocietyService } from 'src/collective-management-society/collective-management-society.service';
import { SocietyAffiliation } from './entities/society-affiliation.entity';
import { SocietyAffiliationStatus } from './entities/society-affiliation-status.enum';
import { SocietyAffiliationRightsType } from './entities/society-affiliation-rights-type.enum';
import { CreateSocietyAffiliationDto } from './dto/create-society-affiliation.dto';
import { UpdateSocietyAffiliationDto } from './dto/update-society-affiliation.dto';
import { EndSocietyAffiliationDto } from './dto/end-society-affiliation.dto';

/** Estados que cuentan como "activos" para el chequeo anti-duplicado (espejo del índice único parcial de la migración). */
const ACTIVE_STATUSES = [SocietyAffiliationStatus.PENDING, SocietyAffiliationStatus.ACTIVE, SocietyAffiliationStatus.SUSPENDED];

@Injectable()
export class SocietyAffiliationService {
  constructor(
    @InjectRepository(SocietyAffiliation)
    private readonly repository: Repository<SocietyAffiliation>,
    private readonly authorizationService: AuthorizationService,
    private readonly eventBus: EventBusService,
    private readonly collectiveManagementSocietyService: CollectiveManagementSocietyService,
  ) {}

  async findAllForAuthor(authorId: string, user: JwtPayload): Promise<SocietyAffiliation[]> {
    await this.assertOwnership(authorId, user, 'rights.society_affiliation.view');

    return this.repository.find({
      where: { authorId },
      relations: ['collectiveManagementSociety'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(authorId: string, dto: CreateSocietyAffiliationDto, user: JwtPayload): Promise<SocietyAffiliation> {
    await this.assertOwnership(authorId, user, 'rights.society_affiliation.manage');
    // Valida que la sociedad exista en el catálogo controlado antes del insert.
    await this.collectiveManagementSocietyService.findOne(dto.collectiveManagementSocietyId);
    await this.assertNoActiveDuplicate(authorId, dto.collectiveManagementSocietyId, dto.rightsType, dto.territory);

    const affiliation = this.repository.create({
      authorId,
      collectiveManagementSocietyId: dto.collectiveManagementSocietyId,
      rightsType: dto.rightsType,
      territory: dto.territory,
      membershipNumber: dto.membershipNumber ?? null,
      ipiNameNumber: dto.ipiNameNumber ?? null,
      ipiBaseNumber: dto.ipiBaseNumber ?? null,
      validFrom: dto.validFrom ?? null,
      status: SocietyAffiliationStatus.ACTIVE,
    });

    const saved = await this.repository.save(affiliation);

    this.emitAuditEvent('society-affiliation.created', saved, user, null, { ...saved });
    return saved;
  }

  async update(authorId: string, affiliationId: string, dto: UpdateSocietyAffiliationDto, user: JwtPayload): Promise<SocietyAffiliation> {
    const affiliation = await this.findOneForAuthor(authorId, affiliationId, user, 'rights.society_affiliation.manage');
    const before = { ...affiliation };

    const nextSocietyId = dto.collectiveManagementSocietyId ?? affiliation.collectiveManagementSocietyId;
    const nextRightsType = dto.rightsType ?? affiliation.rightsType;
    const nextTerritory = dto.territory ?? affiliation.territory;
    if (
      dto.collectiveManagementSocietyId !== undefined ||
      dto.rightsType !== undefined ||
      dto.territory !== undefined
    ) {
      if (dto.collectiveManagementSocietyId !== undefined) {
        await this.collectiveManagementSocietyService.findOne(dto.collectiveManagementSocietyId);
      }
      await this.assertNoActiveDuplicate(authorId, nextSocietyId, nextRightsType, nextTerritory, affiliationId);
    }

    affiliation.collectiveManagementSocietyId = nextSocietyId;
    affiliation.rightsType = nextRightsType;
    affiliation.territory = nextTerritory;
    if (dto.membershipNumber !== undefined) affiliation.membershipNumber = dto.membershipNumber;
    if (dto.ipiNameNumber !== undefined) affiliation.ipiNameNumber = dto.ipiNameNumber;
    if (dto.ipiBaseNumber !== undefined) affiliation.ipiBaseNumber = dto.ipiBaseNumber;
    if (dto.validFrom !== undefined) affiliation.validFrom = dto.validFrom;
    // `verificationStatus` es informativo, autodeclarado por el propio autor en este endpoint
    // self-service (§12: solo staff tendría capability para VERIFIED/REJECTED en una fase futura).
    if (dto.verificationStatus !== undefined) affiliation.verificationStatus = dto.verificationStatus;

    const saved = await this.repository.save(affiliation);

    this.emitAuditEvent('society-affiliation.updated', saved, user, before, { ...saved });
    return saved;
  }

  /** Finaliza una afiliación sin eliminarla (§9, §11: el historial se conserva). */
  async end(authorId: string, affiliationId: string, dto: EndSocietyAffiliationDto, user: JwtPayload): Promise<SocietyAffiliation> {
    const affiliation = await this.findOneForAuthor(authorId, affiliationId, user, 'rights.society_affiliation.manage');
    const before = { ...affiliation };

    affiliation.status = SocietyAffiliationStatus.ENDED;
    affiliation.validTo = dto.validTo ?? new Date().toISOString().slice(0, 10);

    const saved = await this.repository.save(affiliation);

    this.emitAuditEvent('society-affiliation.ended', saved, user, before, { ...saved });
    return saved;
  }

  /** Afiliaciones ACTIVE de un autor, para el snapshot de `registration-file` (aditivo, §8). */
  async findActiveForAuthor(authorId: string): Promise<SocietyAffiliation[]> {
    return this.repository.find({
      where: { authorId, status: SocietyAffiliationStatus.ACTIVE },
      relations: ['collectiveManagementSociety'],
    });
  }

  private async findOneForAuthor(
    authorId: string,
    affiliationId: string,
    user: JwtPayload,
    capability: string,
  ): Promise<SocietyAffiliation> {
    await this.assertOwnership(authorId, user, capability);

    const affiliation = await this.repository.findOne({ where: { id: affiliationId, authorId } });
    if (!affiliation) throw new NotFoundException('La afiliación no existe');
    return affiliation;
  }

  /**
   * Espejo en aplicación del índice único parcial de la migración (autor +
   * sociedad + derecho + territorio, solo filas PENDING/ACTIVE/SUSPENDED) —
   * permite reabrir la misma combinación tras un ENDED, pero rechaza
   * duplicados concurrentes (§5, §14).
   */
  private async assertNoActiveDuplicate(
    authorId: string,
    collectiveManagementSocietyId: string,
    rightsType: SocietyAffiliationRightsType,
    territory: string,
    excludeAffiliationId?: string,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: {
        authorId,
        collectiveManagementSocietyId,
        rightsType,
        territory,
        status: In(ACTIVE_STATUSES),
        ...(excludeAffiliationId ? { id: Not(excludeAffiliationId) } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe una afiliación activa para esta combinación de sociedad, tipo de derecho y territorio');
    }
  }

  private async assertOwnership(authorId: string, user: JwtPayload, capability: string): Promise<void> {
    const decision = await this.authorizationService.checkResource({ userId: user.id }, capability, { ownerId: authorId });
    if (!decision.allowed) {
      throw new ForbiddenException('No tienes permisos sobre estas afiliaciones');
    }
  }

  private emitAuditEvent(
    event: 'society-affiliation.created' | 'society-affiliation.updated' | 'society-affiliation.ended',
    affiliation: SocietyAffiliation,
    user: JwtPayload,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): void {
    const payload: AppEventMap[typeof event] = {
      societyAffiliationId: affiliation.id,
      actorId: user.id,
      authorId: affiliation.authorId,
      organizationId: null,
      societyId: affiliation.collectiveManagementSocietyId,
      rightsType: affiliation.rightsType,
      before,
      after,
    };
    this.eventBus.emit(event, payload);
  }
}
