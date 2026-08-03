import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { BlogAuthor } from '../entities/blog-author.entity';

export class BlogAuthorPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre del autor (búsqueda parcial)', example: 'Jesse' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PaginatedBlogAuthorResponseDto {
  data: BlogAuthor[];
  total: number;
}
