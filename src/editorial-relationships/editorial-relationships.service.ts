import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { Organization } from 'src/organizations/entities/organization.entity';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { AccessRequest } from 'src/organizations/entities/access-request.entity';
import { AccessRequestStatus } from 'src/organizations/entities/access-request-status.enum';
import { PublisherShare } from 'src/publisher-share/entities/publisher-share.entity';
import { PublisherShareService } from 'src/publisher-share/publisher-share.service';
import { PublishingContractsService } from 'src/publishing-contracts/publishing-contracts.service';
import { EditorialRelationshipDto } from './dto/editorial-relationship-response.dto';

/**
 * Compone el historial unificado de relaciones editora-autor (Feature 8 /
 * Flow 3) a partir de 3 fuentes existentes, sin entidad propia: los contratos
 * autodeclarados (`PublishingContract`, Flow 1), los Publisher's Share
 * confirmados (`PublisherShare`, Flow 2) y las solicitudes de acceso
 * rechazadas hacia organizaciones PUBLISHER (`AccessRequest`).
 */
@Injectable()
export class EditorialRelationshipsService {
  constructor(
    @InjectRepository(AccessRequest)
    private readonly accessRequestRepo: Repository<AccessRequest>,
    @InjectRepository(PublisherShare)
    private readonly publisherShareRepo: Repository<PublisherShare>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly publisherShareService: PublisherShareService,
    private readonly publishingContractsService: PublishingContractsService,
  ) {}

  /** Historial del autor: sus contratos autodeclarados + sus shares confirmados + sus solicitudes rechazadas. */
  async getMine(user: JwtPayload): Promise<EditorialRelationshipDto[]> {
    const [contracts, resolvedShares, rejectedRequests] = await Promise.all([
      this.publishingContractsService.findMine(user),
      this.publisherShareService.resolveForUser(user.id),
      this.accessRequestRepo.find({
        where: { userId: user.id, status: AccessRequestStatus.REJECTED, organization: { type: OrganizationType.PUBLISHER } },
        relations: { organization: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const declared: EditorialRelationshipDto[] = contracts.map((contract) => ({
      source: 'SELF_DECLARED',
      status: 'declarada',
      editoraName: contract.publisherName,
      editoraIpiNumber: contract.ipiNumber,
      percentage: contract.percentage !== null ? Number(contract.percentage) : null,
      documentUrl: contract.documentUrl,
      confirmedAt: null,
      createdAt: contract.createdAt,
      counterpartyName: null,
    }));

    const confirmed: EditorialRelationshipDto[] = resolvedShares.map((share) => ({
      source: 'PUBLISHER_CONFIRMED',
      status: 'confirmada',
      editoraName: share.organizationName,
      editoraIpiNumber: share.organizationIpiNumber,
      percentage: share.percentage,
      documentUrl: share.contractUrl,
      confirmedAt: share.confirmedAt,
      createdAt: share.confirmedAt ?? new Date(),
      counterpartyName: null,
    }));

    const rejected: EditorialRelationshipDto[] = rejectedRequests.map((request) => ({
      source: 'PUBLISHER_CONFIRMED',
      status: 'rechazada',
      editoraName: request.organization.name,
      editoraIpiNumber: request.organization.ipiNumber ?? null,
      percentage: null,
      documentUrl: null,
      confirmedAt: null,
      createdAt: request.decidedAt ?? request.createdAt,
      counterpartyName: null,
    }));

    return this.sortByDate([...declared, ...confirmed, ...rejected]);
  }

  /** Historial del lado editora: su roster (shares) + sus solicitudes rechazadas. */
  async getForOrganization(organizationId: string): Promise<EditorialRelationshipDto[]> {
    await this.assertPublisher(organizationId);

    const [shares, rejectedRequests] = await Promise.all([
      this.publisherShareRepo.find({
        where: { organizationId, enabled: true },
        relations: { user: true, organization: true },
      }),
      this.accessRequestRepo.find({
        where: { organizationId, status: AccessRequestStatus.REJECTED },
        relations: { user: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const confirmed: EditorialRelationshipDto[] = shares.map((share) => ({
      source: 'PUBLISHER_CONFIRMED',
      status: share.confirmedAt ? 'confirmada' : 'activa_sin_confirmar',
      editoraName: share.organization.name,
      editoraIpiNumber: share.organization.ipiNumber ?? null,
      percentage: Number(share.percentage),
      documentUrl: share.contractUrl,
      confirmedAt: share.confirmedAt,
      createdAt: share.confirmedAt ?? share.createdAt,
      counterpartyName: this.displayName(share.user.name, share.user.lastName),
    }));

    const rejected: EditorialRelationshipDto[] = rejectedRequests.map((request) => ({
      source: 'PUBLISHER_CONFIRMED',
      status: 'rechazada',
      editoraName: request.organization?.name ?? '',
      editoraIpiNumber: request.organization?.ipiNumber ?? null,
      percentage: null,
      documentUrl: null,
      confirmedAt: null,
      createdAt: request.decidedAt ?? request.createdAt,
      counterpartyName: this.displayName(request.user.name, request.user.lastName),
    }));

    return this.sortByDate([...confirmed, ...rejected]);
  }

  private displayName(name?: string, lastName?: string): string {
    return [name, lastName].filter(Boolean).join(' ').trim();
  }

  private sortByDate(items: EditorialRelationshipDto[]): EditorialRelationshipDto[] {
    return items.sort((a, b) => {
      const dateA = (a.confirmedAt ?? a.createdAt).getTime();
      const dateB = (b.confirmedAt ?? b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  private async assertPublisher(organizationId: string): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.type !== OrganizationType.PUBLISHER) {
      throw new BadRequestException('El historial de relaciones editoriales solo aplica a organizaciones tipo PUBLISHER');
    }
  }
}
