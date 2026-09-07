import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BlogArticlesService } from './blog-articles.service';
import { BlogArticlePublicPaginationDto } from './dto/blog-article-public-pagination.dto';

@ApiTags('Blog Articles')
@Controller('blog/articles')
export class BlogArticlesController {
  constructor(private readonly blogArticlesService: BlogArticlesService) { }

  @Get()
  @ApiOperation({ summary: 'Listar artículos publicados del blog' })
  async findAllArticlesController(@Query() pagination: BlogArticlePublicPaginationDto) {
    return await this.blogArticlesService.findAllArticlesPublicService(pagination);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener un artículo publicado por su slug' })
  async findArticleBySlugController(@Param('slug') slug: string) {
    return await this.blogArticlesService.findArticleBySlugPublicService(slug);
  }
}
