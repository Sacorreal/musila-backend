import { ApiProperty } from '@nestjs/swagger';
import { Track } from '../entities/track.entity';
import { ExternalId } from '../entities/external-id.entity';
import { User } from '../../users/entities/user.entity';
import { Mood } from '../../moods/entities/mood.entity';
import { Theme } from '../../themes/entities/theme.entity';
import { CertificateStatus } from '../../certificates/entities/certificate-status.enum';

/** DTO ligero para serializar moods sin exponer metadata interna del catálogo */
export class MoodTrackDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;

  static fromEntity(mood: Mood): MoodTrackDto {
    const dto = new MoodTrackDto();
    dto.id = mood.id;
    dto.name = mood.name;
    return dto;
  }
}

/** DTO ligero para serializar el tema sin exponer metadata interna del catálogo */
export class ThemeTrackDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;

  static fromEntity(theme: Theme): ThemeTrackDto {
    const dto = new ThemeTrackDto();
    dto.id = theme.id;
    dto.name = theme.name;
    return dto;
  }
}

/** DTO ligero para serializar autores sin exponer datos sensibles */
export class TrackAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) artistName?: string;
  @ApiProperty() email: string;
  @ApiProperty() planType: string;

  static fromUser(user: User): TrackAuthorDto {
    const dto = new TrackAuthorDto();
    dto.id = user.id;
    dto.name = user.name;
    dto.artistName = undefined;
    dto.email = user.email;
    dto.planType = user.planType;
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

  @ApiProperty({ type: [MoodTrackDto], description: 'Moods asociados al track' })
  moods: MoodTrackDto[];

  @ApiProperty({ type: ThemeTrackDto, nullable: true, description: 'Tema/uso asociado al track' })
  theme: ThemeTrackDto | null;

  @ApiProperty({ description: 'Indica si la canción está grabada a dúo/varias voces (Feat)' })
  isFeat: boolean;

  @ApiProperty({ nullable: true })
  coverKey?: string;

  @ApiProperty({ nullable: true })
  sheetMusicUrl?: string;

  @ApiProperty({ nullable: true })
  sheetMusicKey?: string;

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

  @ApiProperty({ enum: CertificateStatus, nullable: true, description: 'Estado del Certificado de Autoría, si ya existe' })
  certificateStatus?: CertificateStatus | null;

  /**
   * Transforma una entidad Track en TrackResponseDto,
   * incluyendo todas las relaciones cargadas.
   */
  static fromEntity(track: Track, certificateStatus?: CertificateStatus | null): TrackResponseDto {
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
    dto.moods = track.moods?.map((m) => MoodTrackDto.fromEntity(m)) ?? [];
    dto.theme = track.theme ? ThemeTrackDto.fromEntity(track.theme) : null;
    dto.isFeat = track.isFeat;
    dto.coverKey = track.coverKey;
    dto.sheetMusicUrl = track.sheetMusicUrl;
    dto.sheetMusicKey = track.sheetMusicKey;
    dto.authors = track.authors?.map((u) => TrackAuthorDto.fromUser(u)) ?? [];
    dto.intellectualProperties = track.intellectualProperties ?? [];
    dto.playlists = (track.playlists ?? []) as unknown[];
    dto.requestedTrack = (track.requestedTrack ?? []) as unknown[];
    dto.createdAt = track.createdAt;
    dto.updatedAt = track.updatedAt;
    dto.certificateStatus = certificateStatus ?? null;
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