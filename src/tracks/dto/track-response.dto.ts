import { ApiProperty } from '@nestjs/swagger';
import { Track } from '../entities/track.entity';
import { ExternalId } from '../entities/external-id.entity';

export class TrackResponseDto {
  @ApiProperty({ example: 'uuid-1234' })
  id: string;

  @ApiProperty({ example: 'Mi canción' })
  title: string;

  @ApiProperty({
    example: 'Rock',
    description: 'Nombre del género musical (no el ID)',
  })
  genre: string;

  @ApiProperty({ example: 'Pop rock', nullable: true })
  subGenre?: string;

  @ApiProperty({ nullable: true })
  coverUrl?: string;

  @ApiProperty({ nullable: true })
  audioUrl?: string;

  @ApiProperty({ nullable: true })
  year?: number;

  @ApiProperty()
  audioKey: string;

  @ApiProperty()
  language: string;

  @ApiProperty({ nullable: true })
  lyric?: string;

  @ApiProperty({ nullable: true, type: 'array' })
  externalsIds?: ExternalId[];

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isGospel: boolean;

  @ApiProperty({ nullable: true })
  coverKey?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  /**
   * Transforma una entidad Track en TrackResponseDto,
   * extrayendo solo el nombre del género en lugar del objeto MusicalGenre completo.
   */
  static fromEntity(track: Track): TrackResponseDto {
    const dto = new TrackResponseDto();
    dto.id = track.id;
    dto.title = track.title;
    dto.genre = track.genre?.genre ?? null;
    dto.subGenre = track.subGenre;
    dto.coverUrl = track.coverUrl;
    dto.audioUrl = track.audioUrl;
    dto.year = track.year;
    dto.audioKey = track.audioKey;
    dto.language = track.language;
    dto.lyric = track.lyric;
    dto.externalsIds = track.externalsIds;
    dto.isAvailable = track.isAvailable;
    dto.isGospel = track.isGospel;
    dto.coverKey = track.coverKey;
    dto.createdAt = track.createdAt;
    dto.updatedAt = track.updatedAt;
    return dto;
  }
}

export class PaginatedTracksResponseDto {
  @ApiProperty({ type: [TrackResponseDto], description: 'Lista de tracks' })
  data: TrackResponseDto[];

  @ApiProperty({
    example: 100,
    description: 'Total de tracks que coinciden con el filtro',
  })
  total: number;
}