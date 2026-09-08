import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { BlogArticlesService } from './blog-articles.service';
import { CreateBlogArticleDto } from './dto/create-blog-article.dto';
import { UpdateBlogArticleDto } from './dto/update-blog-article.dto';
import { BlogArticleAdminPaginationDto } from './dto/blog-article-admin-pagination.dto';

@ApiTags('Blog Articles (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@Controller('blog/admin/articles')
export class BlogArticlesAdminController {
  constructor(private readonly blogArticlesService: BlogArticlesService) { }

  @Post()
  @RequireCapability('platform.blog.articles.create')
  @ApiOperation({ summary: 'Crear un artículo de blog' })
  async createArticleController(@Body() createBlogArticleDto: CreateBlogArticleDto) {
    return await this.blogArticlesService.createArticleService(createBlogArticleDto);
  }

  @Get()
  @RequireCapability('platform.blog.articles.view')
  @ApiOperation({ summary: 'Listar artículos del blog con filtros (autor, etiqueta, estado, fechas, búsqueda)' })
  async findAllArticlesController(@Query() pagination: BlogArticleAdminPaginationDto) {
    return await this.blogArticlesService.findAllArticlesAdminService(pagination);
  }

  @Get(':id')
  @RequireCapability('platform.blog.articles.view')
  @ApiOperation({ summary: 'Obtener el detalle de un artículo por ID' })
  async findOneArticleController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogArticlesService.findOneArticleAdminService(id);
  }

  @Put(':id')
  @RequireCapability('platform.blog.articles.edit')
  @ApiOperation({ summary: 'Actualizar un artículo de blog' })
  async updateArticleController(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlogArticleDto: UpdateBlogArticleDto,
  ) {
    return await this.blogArticlesService.updateArticleService(id, updateBlogArticleDto);
  }

  @Patch(':id/publish')
  @RequireCapability('platform.blog.articles.publish')
  @ApiOperation({ summary: 'Publicar un artículo de blog' })
  async publishArticleController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogArticlesService.publishArticleService(id);
  }

  @Patch(':id/unpublish')
  @RequireCapability('platform.blog.articles.publish')
  @ApiOperation({ summary: 'Volver a borrador un artículo de blog' })
  async unpublishArticleController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogArticlesService.unpublishArticleService(id);
  }

  @Delete(':id')
  @RequireCapability('platform.blog.articles.delete')
  @ApiOperation({ summary: 'Eliminar un artículo de blog' })
  async removeArticleController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogArticlesService.removeArticleService(id);
  }
}
