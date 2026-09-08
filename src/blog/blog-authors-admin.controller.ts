import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { BlogAuthorsService } from './blog-authors.service';
import { CreateBlogAuthorDto } from './dto/create-blog-author.dto';
import { UpdateBlogAuthorDto } from './dto/update-blog-author.dto';
import { BlogAuthorPaginationDto } from './dto/blog-author-pagination.dto';

@ApiTags('Blog Authors (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@RequireCapability('platform.blog.authors.manage')
@Controller('blog/admin/authors')
export class BlogAuthorsAdminController {
  constructor(private readonly blogAuthorsService: BlogAuthorsService) { }

  @Post()
  @ApiOperation({ summary: 'Registrar un autor de blog' })
  async createAuthorController(@Body() createBlogAuthorDto: CreateBlogAuthorDto) {
    return await this.blogAuthorsService.createAuthorService(createBlogAuthorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar autores de blog' })
  async findAllAuthorsController(@Query() pagination: BlogAuthorPaginationDto) {
    return await this.blogAuthorsService.findAllAuthorsService(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de un autor por ID' })
  async findOneAuthorController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogAuthorsService.findOneAuthorAdminService(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un autor de blog' })
  async updateAuthorController(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlogAuthorDto: UpdateBlogAuthorDto,
  ) {
    return await this.blogAuthorsService.updateAuthorService(id, updateBlogAuthorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un autor de blog' })
  async removeAuthorController(@Param('id', ParseUUIDPipe) id: string) {
    return await this.blogAuthorsService.removeAuthorService(id);
  }
}
