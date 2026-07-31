import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { Repository } from 'typeorm';
import { CreateMoodInput } from './dto/create-mood.input';
import { UpdateMoodInput } from './dto/update-mood.input';
import { Mood } from './entities/mood.entity';
import { PaginationDto } from '../shared/dto/pagination.dto';

const moodRelations: string[] = ['tracks', 'tracks.authors'];

@Injectable()
export class MoodsService {
  constructor(
    @InjectRepository(Mood)
    private readonly moodRepository: Repository<Mood>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) { }

  private async findMoodWithRelations(
    identifier: string,
  ): Promise<Mood> {
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(identifier);

    let mood: Mood | null = null;

    if (isUUID) {
      mood = await this.moodRepository.findOne({
        where: { id: identifier },
        relations: moodRelations,
      });
    } else {
      mood = await this.moodRepository.findOne({
        where: { slug: identifier },
        relations: moodRelations,
      });
    }

    if (!mood) throw new NotFoundException('El mood no existe');
    return mood;
  }

  private async saveAndReturnMoodWithRelations(
    mood: Mood,
  ): Promise<Mood> {
    const savedMood = await this.moodRepository.save(mood);
    return await this.findMoodWithRelations(savedMood.id);
  }

  async createMoodService(createMoodInput: CreateMoodInput) {
    const newMood = this.moodRepository.create(createMoodInput);
    return await this.saveAndReturnMoodWithRelations(newMood);
  }

  async findAllMoodService(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;

    const [data, total] = await this.moodRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOneMoodService(id: string) {
    return await this.findMoodWithRelations(id);
  }

  async updateMoodService(id: string, updateMoodInput: UpdateMoodInput) {
    const existingMood = await this.findMoodWithRelations(id);

    Object.assign(existingMood, updateMoodInput);

    return await this.saveAndReturnMoodWithRelations(existingMood);
  }

  async removeMoodService(id: string) {
    const moodToRemove = await this.findMoodWithRelations(id);

    await this.moodRepository.softRemove(moodToRemove);

    return moodToRemove;
  }
}
