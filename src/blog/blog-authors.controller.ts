import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { BlogAuthorsService } from './blog-authors.service';
import { BlogArticlesService } from './blog-articles.service';

@ApiTags('Blog Authors')
@Controller('blog/authors')
export class BlogAuthorsController {
  constructor(
    private readonly blogAuthorsService: BlogAuthorsService,
    private readonly blogArticlesService: BlogArticlesService,
  ) { }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener el perfil público de un autor por su slug' })
  async findAuthorBySlugController(@Param('slug') slug: string) {
    return await this.blogAuthorsService.findBySlugPublicService(slug);
  }

  @Get(':slug/articles')
  @ApiOperation({ summary: 'Listar los artículos publicados de un autor' })
  async findAuthorArticlesController(@Param('slug') slug: string, @Query() pagination: PaginationDto) {
    const author = await this.blogAuthorsService.findBySlugPublicService(slug);
    return await this.blogArticlesService.findArticlesByAuthorIdPublicService(author.id, pagination);
  }
}
