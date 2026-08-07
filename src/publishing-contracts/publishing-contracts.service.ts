import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { isAdminPlanType } from 'src/users/entities/user-plan-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';

import { PublishingContract } from './entities/publishing-contract.entity';
import { CreatePublishingContractDto } from './dto/create-publishing-contract.dto';
import { UpdatePublishingContractDto } from './dto/update-publishing-contract.dto';

@Injectable()
export class PublishingContractsService {
  constructor(
    @InjectRepository(PublishingContract)
    private readonly publishingContractRepository: Repository<PublishingContract>,
    private readonly eventBus: EventBusService,
  ) {}

  async create(dto: CreatePublishingContractDto, user: JwtPayload): Promise<PublishingContract> {
    const contract = this.publishingContractRepository.create({
      owner: { id: user.id } as PublishingContract['owner'],
      publisherName: dto.publisherName,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      documentKey: dto.documentKey,
      documentUrl: dto.documentUrl,
    });

    const saved = await this.publishingContractRepository.save(contract);

    this.eventBus.emit('publishing-contract.created', {
      publishingContractId: saved.id,
      ownerId: user.id,
      publisherName: saved.publisherName,
    });

    return saved;
  }

  /** Contratos del usuario autenticado, para el selector "contratos elegibles" del wizard de expediente. */
  async findMine(user: JwtPayload): Promise<PublishingContract[]> {
    return this.publishingContractRepository.find({
      where: { owner: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: JwtPayload): Promise<PublishingContract> {
    const contract = await this.publishingContractRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!contract) throw new NotFoundException('El contrato editorial no existe');
    this.assertOwnership(contract, user);
    return contract;
  }

  async update(id: string, dto: UpdatePublishingContractDto, user: JwtPayload): Promise<PublishingContract> {
    const contract = await this.findOne(id, user);

    if (dto.publisherName !== undefined) contract.publisherName = dto.publisherName;
    if (dto.startDate !== undefined) contract.startDate = dto.startDate;
    if (dto.endDate !== undefined) contract.endDate = dto.endDate;
    if (dto.documentKey !== undefined) contract.documentKey = dto.documentKey;
    if (dto.documentUrl !== undefined) contract.documentUrl = dto.documentUrl;

    return this.publishingContractRepository.save(contract);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const contract = await this.findOne(id, user);
    await this.publishingContractRepository.softDelete(contract.id);
  }

  private assertOwnership(contract: PublishingContract, user: JwtPayload): void {
    const isOwner = contract.owner?.id === user.id;
    if (!isOwner && !isAdminPlanType(user.planType)) {
      throw new ForbiddenException('No tienes permisos sobre este contrato editorial');
    }
  }
}
