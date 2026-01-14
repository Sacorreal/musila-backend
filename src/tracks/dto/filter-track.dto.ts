import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
export class FilterTrackDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The number of items to return',
    example: 10,
  })
  limit: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The number of items to skip',
    example: 0,
  })
  offset: number;

  @IsBoolean()
  @IsOptional()
  isGospel: boolean;

  @IsOptional()
  genreId: string;

  @IsOptional()
  subGenre: string;

  @IsOptional()
  language: string;

  @IsOptional()
  isAvailable: boolean;
}
