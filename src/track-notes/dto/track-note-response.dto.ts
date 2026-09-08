import { ApiProperty } from '@nestjs/swagger';

export class TrackNoteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  trackId: string;

  @ApiProperty({ nullable: true })
  playlistId: string | null;

  @ApiProperty()
  authorId: string;

  @ApiProperty()
  authorName: string;

  @ApiProperty({ enum: ['USER', 'GUEST'] })
  authorType: 'USER' | 'GUEST';

  @ApiProperty()
  content: string;

  @ApiProperty({ nullable: true })
  timestampSeconds: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
