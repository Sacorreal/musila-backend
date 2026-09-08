import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { BlogTagsService } from './blog-tags.service';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';

@ApiTags('Blog Tags (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@RequireCapability('platform.blog.tags.manage')
@Controller('blog/admin/tags')
export class BlogTagsAdminController {
  constructor(private readonly blogTagsService: BlogTagsService) { }

  @Post()
  @ApiOperation({ summary: 'Crear una etiqueta de servicio relacionado' })
  async createTagController(@Body() createBlogTagDto: CreateBlogTagDto) {
    return await this.blogTagsService.createTagService(createBlogTagDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar etiquetas de servicios relacionados' })
  async findAllTagsController(@Query() pagination: PaginationDto) {
    return await this.blogTagsService.findAllTagsService(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una etiqueta por ID' })
  async findOneTagController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogTagsService.findOneTagService(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una etiqueta de servicio relacionado' })
  async updateTagController(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlogTagDto: UpdateBlogTagDto,
  ) {
    return await this.blogTagsService.updateTagService(id, updateBlogTagDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una etiqueta de servicio relacionado' })
  async removeTagController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogTagsService.removeTagService(id);
  }
}
