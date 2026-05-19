import { ApiProperty } from '@nestjs/swagger';
import { Track } from '../entities/track.entity';
import { ExternalId } from '../entities/external-id.entity';
import { User } from '../../users/entities/user.entity';

/** DTO ligero para serializar autores sin exponer datos sensibles */
export class TrackAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) artistName?: string;
  @ApiProperty() email: string;
  @ApiProperty() role: string;

  static fromUser(user: User): TrackAuthorDto {
    const dto = new TrackAuthorDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.artistName = undefined;
    dto.email = user.email;
    dto.role = user.role;
    return dto;
  }
}

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

  @ApiProperty({ nullable: true })
  iswc?: string;

  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  isGospel: boolean;

  @ApiProperty({ nullable: true })
  coverKey?: string;

  @ApiProperty({ type: [TrackAuthorDto], description: 'Autores del track' })
  authors: TrackAuthorDto[];

  @ApiProperty({ nullable: true, description: 'Propiedades intelectuales asociadas' })
  intellectualProperties?: any[];

  @ApiProperty({ nullable: true, description: 'Playlists que contienen este track' })
  playlists?: any[];

  @ApiProperty({ nullable: true, description: 'Solicitudes asociadas al track' })
  requestedTrack?: any[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  /**
   * Transforma una entidad Track en TrackResponseDto,
   * incluyendo todas las relaciones cargadas.
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
    dto.iswc = track.iswc;
    dto.isAvailable = track.isAvailable;
    dto.isGospel = track.isGospel;
    dto.coverKey = track.coverKey;
    dto.authors = track.authors?.map((u) => TrackAuthorDto.fromUser(u)) ?? [];
    dto.intellectualProperties = track.intellectualProperties ?? [];
    dto.playlists = (track.playlists ?? []) as unknown[];
    dto.requestedTrack = (track.requestedTrack ?? []) as unknown[];
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