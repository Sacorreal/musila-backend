import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { SocietyAffiliationTerritoryMode } from './entities/society-affiliation-territory-mode.enum';
import { CreateSocietyAffiliationDto } from './dto/create-society-affiliation.dto';
import { UpdateSocietyAffiliationDto } from './dto/update-society-affiliation.dto';
import { EndSocietyAffiliationDto } from './dto/end-society-affiliation.dto';

interface TerritoryDescriptor {
  mode: SocietyAffiliationTerritoryMode;
  countries: string[];
}

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

    const territoryCountries = this.normalizeTerritoryCountries(dto.territoryMode, dto.territoryCountries);
    await this.assertNoActiveOverlap(authorId, dto.collectiveManagementSocietyId, dto.rightsType, {
      mode: dto.territoryMode,
      countries: territoryCountries,
    });

    const affiliation = this.repository.create({
      authorId,
      collectiveManagementSocietyId: dto.collectiveManagementSocietyId,
      rightsType: dto.rightsType,
      territoryMode: dto.territoryMode,
      territoryCountries,
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
    const nextTerritoryMode = dto.territoryMode ?? affiliation.territoryMode;
    const territoryChanged = dto.territoryMode !== undefined || dto.territoryCountries !== undefined;
    const nextTerritoryCountries = territoryChanged
      ? this.normalizeTerritoryCountries(nextTerritoryMode, dto.territoryCountries ?? affiliation.territoryCountries)
      : affiliation.territoryCountries;

    if (
      dto.collectiveManagementSocietyId !== undefined ||
      dto.rightsType !== undefined ||
      territoryChanged
    ) {
      if (dto.collectiveManagementSocietyId !== undefined) {
        await this.collectiveManagementSocietyService.findOne(dto.collectiveManagementSocietyId);
      }
      await this.assertNoActiveOverlap(
        authorId,
        nextSocietyId,
        nextRightsType,
        { mode: nextTerritoryMode, countries: nextTerritoryCountries },
        affiliationId,
      );
    }

    affiliation.collectiveManagementSocietyId = nextSocietyId;
    affiliation.rightsType = nextRightsType;
    affiliation.territoryMode = nextTerritoryMode;
    affiliation.territoryCountries = nextTerritoryCountries;
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
   * `territoryCountries` es obligatorio (no vacío) salvo en WORLDWIDE, donde
   * se fuerza a `[]` — el frontend nunca debería enviar países en ese modo,
   * pero se normaliza igual por si llega algo desde otro cliente de la API.
   */
  private normalizeTerritoryCountries(
    mode: SocietyAffiliationTerritoryMode,
    countries: string[] | undefined,
  ): string[] {
    if (mode === SocietyAffiliationTerritoryMode.WORLDWIDE) return [];

    if (!countries || countries.length === 0) {
      throw new BadRequestException(
        mode === SocietyAffiliationTerritoryMode.WORLDWIDE_EXCEPT
          ? 'Debes indicar al menos un país excluido'
          : 'Debes seleccionar al menos un país',
      );
    }
    return countries;
  }

  /**
   * Determina si dos territorios (de la misma sociedad + tipo de derecho)
   * cubren al menos un país en común — ej. "mundial excepto EE.UU." y "solo
   * EE.UU." NO se solapan (caso de uso explícito: una sociedad administra el
   * resto del mundo, otra administra únicamente ese país excluido).
   */
  private territoriesOverlap(a: TerritoryDescriptor, b: TerritoryDescriptor): boolean {
    const { WORLDWIDE, WORLDWIDE_EXCEPT } = SocietyAffiliationTerritoryMode;

    // WORLDWIDE cubre cualquier país, así que se solapa con cualquier otro
    // territorio no vacío (WORLDWIDE, WORLDWIDE_EXCEPT siempre cubre alguno,
    // SPECIFIC_COUNTRIES no vacío por `normalizeTerritoryCountries`).
    if (a.mode === WORLDWIDE || b.mode === WORLDWIDE) return true;

    if (a.mode === WORLDWIDE_EXCEPT && b.mode === WORLDWIDE_EXCEPT) {
      // Dos exclusiones casi siempre dejan países en común entre sí (el mundo
      // tiene ~195 países) — se trata como solapamiento por defecto, conservador.
      return true;
    }

    const exceptSide = a.mode === WORLDWIDE_EXCEPT ? a : b.mode === WORLDWIDE_EXCEPT ? b : null;
    const otherSide = exceptSide === a ? b : a;

    if (exceptSide) {
      // "Mundial excepto X" se solapa con el otro lado solo si algún país del
      // otro lado NO está en la lista de exclusión.
      return otherSide.countries.some((country) => !exceptSide.countries.includes(country));
    }

    // SPECIFIC_COUNTRIES vs SPECIFIC_COUNTRIES: se solapan si comparten algún país.
    return a.countries.some((country) => b.countries.includes(country));
  }

  /**
   * Espejo en aplicación del índice único parcial de la migración (autor +
   * sociedad + derecho, solo filas PENDING/ACTIVE/SUSPENDED) — el índice de
   * BD solo bloquea el duplicado exacto (mismo modo + mismo set de países);
   * el solapamiento semántico entre territorios se valida aquí, comparando
   * contra todas las filas activas de la misma combinación autor+sociedad+derecho.
   */
  private async assertNoActiveOverlap(
    authorId: string,
    collectiveManagementSocietyId: string,
    rightsType: SocietyAffiliationRightsType,
    territory: TerritoryDescriptor,
    excludeAffiliationId?: string,
  ): Promise<void> {
    const existingRows = await this.repository.find({
      where: {
        authorId,
        collectiveManagementSocietyId,
        rightsType,
        status: In(ACTIVE_STATUSES),
        ...(excludeAffiliationId ? { id: Not(excludeAffiliationId) } : {}),
      },
    });

    const conflict = existingRows.some((row) =>
      this.territoriesOverlap(territory, { mode: row.territoryMode, countries: row.territoryCountries }),
    );

    if (conflict) {
      throw new ConflictException(
        'Ya existe una afiliación activa para esta sociedad y tipo de derecho cuyo territorio se solapa con el indicado',
      );
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
