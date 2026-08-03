import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { BlogAuthorsService } from './blog-authors.service';
import { CreateBlogAuthorDto } from './dto/create-blog-author.dto';
import { UpdateBlogAuthorDto } from './dto/update-blog-author.dto';
import { BlogAuthorPaginationDto } from './dto/blog-author-pagination.dto';

@ApiTags('Blog Authors (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
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
