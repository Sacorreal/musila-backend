import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { Repository } from 'typeorm';
import { CreateThemeInput } from './dto/create-theme.input';
import { UpdateThemeInput } from './dto/update-theme.input';
import { Theme } from './entities/theme.entity';
import { PaginationDto } from '../shared/dto/pagination.dto';

const themeRelations: string[] = ['tracks', 'tracks.authors'];

@Injectable()
export class ThemesService {
  constructor(
    @InjectRepository(Theme)
    private readonly themeRepository: Repository<Theme>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) { }

  private async findThemeWithRelations(
    identifier: string,
  ): Promise<Theme> {
    const isUUID = /^[0-9a-fA-F-]{36}$/.test(identifier);

    let theme: Theme | null = null;

    if (isUUID) {
      theme = await this.themeRepository.findOne({
        where: { id: identifier },
        relations: themeRelations,
      });
    } else {
      theme = await this.themeRepository.findOne({
        where: { slug: identifier },
        relations: themeRelations,
      });
    }

    if (!theme) throw new NotFoundException('El tema no existe');
    return theme;
  }

  private async saveAndReturnThemeWithRelations(
    theme: Theme,
  ): Promise<Theme> {
    const savedTheme = await this.themeRepository.save(theme);
    return await this.findThemeWithRelations(savedTheme.id);
  }

  async createThemeService(createThemeInput: CreateThemeInput) {
    const newTheme = this.themeRepository.create(createThemeInput);
    return await this.saveAndReturnThemeWithRelations(newTheme);
  }

  async findAllThemeService(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;

    const [data, total] = await this.themeRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });

    return { data, total };
  }

  async findOneThemeService(id: string) {
    return await this.findThemeWithRelations(id);
  }

  async updateThemeService(id: string, updateThemeInput: UpdateThemeInput) {
    const existingTheme = await this.findThemeWithRelations(id);

    Object.assign(existingTheme, updateThemeInput);

    return await this.saveAndReturnThemeWithRelations(existingTheme);
  }

  async removeThemeService(id: string) {
    const themeToRemove = await this.findThemeWithRelations(id);

    await this.themeRepository.softRemove(themeToRemove);

    return themeToRemove;
  }
}
