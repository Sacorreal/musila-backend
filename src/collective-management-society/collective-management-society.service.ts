import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectiveManagementSociety } from './entities/collective-management-society.entity';
import { CollectiveManagementSocietyStatus } from './entities/collective-management-society-status.enum';
import { CreateCollectiveManagementSocietyDto } from './dto/create-collective-management-society.dto';
import { UpdateCollectiveManagementSocietyDto } from './dto/update-collective-management-society.dto';
import { ListCollectiveManagementSocietyDto } from './dto/list-collective-management-society.dto';

@Injectable()
export class CollectiveManagementSocietyService {
  constructor(
    @InjectRepository(CollectiveManagementSociety)
    private readonly repository: Repository<CollectiveManagementSociety>,
  ) {}

  async create(dto: CreateCollectiveManagementSocietyDto): Promise<CollectiveManagementSociety> {
    const society = this.repository.create(dto);
    return this.repository.save(society);
  }

  async findAll(query: ListCollectiveManagementSocietyDto): Promise<{ data: CollectiveManagementSociety[]; total: number }> {
    const { limit, offset, country, search } = query;

    const qb = this.repository.createQueryBuilder('cms').orderBy('cms.acronym', 'ASC').take(limit).skip(offset);

    if (country) {
      qb.andWhere('cms.isoCountryCode = :country', { country });
    }

    if (search) {
      qb.andWhere('(cms.acronym ILIKE :search OR cms.officialName ILIKE :search)', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<CollectiveManagementSociety> {
    const society = await this.repository.findOne({ where: { id } });
    if (!society) throw new NotFoundException('La sociedad de gestión colectiva no existe');
    return society;
  }

  async update(id: string, dto: UpdateCollectiveManagementSocietyDto): Promise<CollectiveManagementSociety> {
    const society = await this.findOne(id);
    Object.assign(society, dto);
    return this.repository.save(society);
  }

  /** "Eliminar" un registro del catálogo nunca es hard-delete: se marca DEPRECATED (§3, §15). */
  async deprecate(id: string): Promise<CollectiveManagementSociety> {
    const society = await this.findOne(id);
    society.status = CollectiveManagementSocietyStatus.DEPRECATED;
    return this.repository.save(society);
  }
}
