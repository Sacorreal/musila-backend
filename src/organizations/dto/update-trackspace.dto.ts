import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTrackspaceDto {
  @ApiPropertyOptional({ example: 'Sony Music Workspace' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.musila.com/logos/sony.png',
    nullable: true,
    description: 'URL del logo; null para quitarlo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;
}
