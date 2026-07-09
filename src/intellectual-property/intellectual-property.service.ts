import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateIntellectualPropertyInput } from './dto/create-intellectual-property.input';
import { UpdateIntellectualPropertyInput } from './dto/update-intellectual-property.input';
import { IntellectualProperty } from './entities/intellectual-property.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { PaginationDto } from '../shared/dto/pagination.dto';

@Injectable()
export class IntellectualPropertyService {
  constructor(
    @InjectRepository(IntellectualProperty)
    private readonly intellectualPropertyRepository: Repository<IntellectualProperty>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  async create(dto: CreateIntellectualPropertyInput): Promise<IntellectualProperty> {
    const track = await this.trackRepository.findOne({ where: { id: dto.trackId } });
    if (!track) throw new NotFoundException('La pista musical no existe');

    const record = this.intellectualPropertyRepository.create({
      type: dto.type,
      key: dto.key,
      documentKey: dto.documentKey,
      documentUrl: dto.documentUrl,
      track,
    });

    return this.intellectualPropertyRepository.save(record);
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const [data, total] = await this.intellectualPropertyRepository.findAndCount({
      relations: ['track'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: string): Promise<IntellectualProperty> {
    const record = await this.intellectualPropertyRepository.findOne({
      where: { id },
      relations: ['track'],
    });
    if (!record) throw new NotFoundException('Registro de propiedad intelectual no encontrado');
    return record;
  }

  async update(id: string, dto: UpdateIntellectualPropertyInput): Promise<IntellectualProperty> {
    const record = await this.findOne(id);

    if (dto.trackId) {
      const track = await this.trackRepository.findOne({ where: { id: dto.trackId } });
      if (!track) throw new NotFoundException('La pista musical no existe');
      record.track = track;
    }

    if (dto.type !== undefined) record.type = dto.type;
    if (dto.key !== undefined) record.key = dto.key;
    if (dto.documentKey !== undefined) record.documentKey = dto.documentKey;
    if (dto.documentUrl !== undefined) record.documentUrl = dto.documentUrl;

    return this.intellectualPropertyRepository.save(record);
  }

  async remove(id: string): Promise<void> {
    const record = await this.findOne(id);
    await this.intellectualPropertyRepository.softDelete(record.id);
  }
}
