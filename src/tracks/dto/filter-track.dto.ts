import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto'; 

export class FilterTrackDto extends PaginationDto {
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isGospel?: boolean;

  @IsString()
  @IsOptional()
  genreId?: string;

  @IsString()
  @IsOptional()
  subGenre?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailable?: boolean;
}