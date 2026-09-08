import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Track } from 'src/tracks/entities/track.entity';

/** Track del compositor que matchea con los géneros/ritmos de la campaña, listo para postular. */
export class MatchingTrackResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional() coverUrl?: string | null;
  @ApiPropertyOptional() audioUrl?: string | null;
  @ApiProperty() genre: string;
  @ApiPropertyOptional() ritmo?: string | null;
  @ApiProperty({ description: 'Si ya se postuló este track a la campaña' })
  alreadySubmitted: boolean;

  static fromEntity(track: Track, alreadySubmitted: boolean): MatchingTrackResponseDto {
    const dto = new MatchingTrackResponseDto();
    dto.id = track.id;
    dto.title = track.title;
    dto.coverUrl = track.coverUrl ?? null;
    dto.audioUrl = track.audioUrl ?? null;
    dto.genre = track.genre?.genre ?? '';
    dto.ritmo = track.ritmo ?? null;
    dto.alreadySubmitted = alreadySubmitted;
    return dto;
  }
}
