import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { In, Repository } from 'typeorm';
import { Capability } from './entities/capability.entity';
import { CapabilitySubject } from './entities/capability-subject.enum';
import { AuthorizationDenyCode } from './interfaces/authorization.types';

export interface CapabilityCatalogFilters {
  domain?: string;
  assignableTo?: CapabilitySubject;
  organizationType?: OrganizationType;
  includeInactive?: boolean;
}

export interface UpdateCapabilityConfigParams {
  name?: string;
  description?: string;
  organizationTypes?: OrganizationType[];
  isActive?: boolean;
}

/**
 * Catálogo global de capabilities (MATRIZ DE CAPACIDADES). Las keys se
 * crean únicamente por seeds versionados (§22); desde la API solo se
 * administra su configuración comercial y de compatibilidad.
 */
@Injectable()
export class CapabilityService {
  constructor(
    @InjectRepository(Capability)
    private readonly capabilityRepository: Repository<Capability>,
    private readonly eventBus: EventBusService,
  ) {}

  async findCatalog(filters: CapabilityCatalogFilters = {}): Promise<Capability[]> {
    const capabilities = await this.capabilityRepository.find({
      order: { domain: 'ASC', key: 'ASC' },
    });

    return capabilities.filter((capability) => {
      if (!filters.includeInactive && !capability.isActive) return false;
      if (filters.domain && capability.domain !== filters.domain) return false;
      if (
        filters.assignableTo &&
        capability.assignableTo.length > 0 &&
        !capability.assignableTo.includes(filters.assignableTo)
      ) {
        return false;
      }
      if (
        filters.organizationType &&
        capability.organizationTypes.length > 0 &&
        !capability.organizationTypes.includes(filters.organizationType)
      ) {
        return false;
      }
      return true;
    });
  }

  async findByIds(ids: string[]): Promise<Capability[]> {
    if (ids.length === 0) return [];
    return this.capabilityRepository.find({ where: { id: In(ids) } });
  }

  async findByKeys(keys: string[]): Promise<Capability[]> {
    if (keys.length === 0) return [];
    return this.capabilityRepository.find({ where: { key: In(keys) } });
  }

  async getById(id: string): Promise<Capability> {
    const capability = await this.capabilityRepository.findOne({ where: { id } });
    if (!capability) {
      throw new NotFoundException('Capability no encontrada');
    }
    return capability;
  }

  /**
   * Valida que un conjunto de capabilities pueda usarse en un rol de un
   * tenant dado. El backend rechaza aunque la UI oculte (§20: regla de
   * seguridad).
   */
  assertCompatibleWithRole(
    capabilities: Capability[],
    expectedSubject: CapabilitySubject,
    organizationType?: OrganizationType,
  ): void {
    for (const capability of capabilities) {
      if (!capability.isActive) {
        throw new BadRequestException({
          message: `La capability '${capability.key}' está inactiva`,
          code: AuthorizationDenyCode.CAPABILITY_DENIED,
          capability: capability.key,
        });
      }

      if (
        capability.assignableTo.length > 0 &&
        !capability.assignableTo.includes(expectedSubject)
      ) {
        throw new BadRequestException({
          message: `La capability '${capability.key}' no es asignable a ${expectedSubject}`,
          code: AuthorizationDenyCode.CAPABILITY_DENIED,
          capability: capability.key,
        });
      }

      if (
        organizationType &&
        capability.organizationTypes.length > 0 &&
        !capability.organizationTypes.includes(organizationType)
      ) {
        throw new BadRequestException({
          message: `La capability '${capability.key}' no está disponible para organizaciones de tipo ${organizationType}`,
          code: AuthorizationDenyCode.CAPABILITY_NOT_AVAILABLE_FOR_ORGANIZATION_TYPE,
          capability: capability.key,
        });
      }
    }
  }

  /** Configuración administrable desde el Admin de Musila (no crea keys nuevas). */
  async updateConfig(id: string, changes: UpdateCapabilityConfigParams): Promise<Capability> {
    const capability = await this.getById(id);

    if (changes.name !== undefined) capability.name = changes.name;
    if (changes.description !== undefined) capability.description = changes.description;
    if (changes.organizationTypes !== undefined) {
      capability.organizationTypes = changes.organizationTypes;
    }
    if (changes.isActive !== undefined) capability.isActive = changes.isActive;
    capability.version += 1;

    const saved = await this.capabilityRepository.save(capability);
    this.eventBus.emit('authorization.capability.updated', { capabilityId: saved.id });
    return saved;
  }
}
