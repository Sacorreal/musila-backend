import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCapability } from '../authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { AuditAction } from '../staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from '../staff-audit/interceptors/staff-audit.interceptor';
import { CollectiveManagementSocietyService } from './collective-management-society.service';
import { CreateCollectiveManagementSocietyDto } from './dto/create-collective-management-society.dto';
import { UpdateCollectiveManagementSocietyDto } from './dto/update-collective-management-society.dto';
import { ListCollectiveManagementSocietyDto } from './dto/list-collective-management-society.dto';
import { PaginatedCollectiveManagementSocietyResponseDto } from './dto/paginated-collective-management-society-response.dto';

/**
 * Catálogo maestro controlado (§3, §6 del requerimiento). Lectura pública
 * (selector de sociedad en formularios de autor); escritura reservada a
 * staff con `rights.society_catalog.manage`.
 */
@ApiTags('Reference Data — Sociedades de Gestión Colectiva')
@Controller('reference-data/collective-management-societies')
export class CollectiveManagementSocietyController {
  constructor(private readonly service: CollectiveManagementSocietyService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sociedades de gestión colectiva', description: 'Catálogo público, filtrable por país (ISO alpha-2) y búsqueda libre.' })
  @ApiResponse({ status: 200, type: PaginatedCollectiveManagementSocietyResponseDto })
  findAll(@Query() query: ListCollectiveManagementSocietyDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una sociedad de gestión colectiva por ID' })
  @ApiParam({ name: 'id', description: 'UUID de la sociedad' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'La sociedad no existe' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequireCapability('rights.society_catalog.manage')
  @UseGuards(JWTAuthGuard, AuthorizationGuard)
  @UseInterceptors(StaffAuditInterceptor)
  @AuditAction('rights_catalog:create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear una sociedad de gestión colectiva en el catálogo maestro' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'No tiene permisos de staff' })
  create(@Body() dto: CreateCollectiveManagementSocietyDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @RequireCapability('rights.society_catalog.manage')
  @UseGuards(JWTAuthGuard, AuthorizationGuard)
  @UseInterceptors(StaffAuditInterceptor)
  @AuditAction('rights_catalog:update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar una sociedad de gestión colectiva' })
  @ApiParam({ name: 'id', description: 'UUID de la sociedad' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'La sociedad no existe' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCollectiveManagementSocietyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireCapability('rights.society_catalog.manage')
  @UseGuards(JWTAuthGuard, AuthorizationGuard)
  @UseInterceptors(StaffAuditInterceptor)
  @AuditAction('rights_catalog:deprecate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Retirar una sociedad de gestión colectiva del catálogo activo',
    description: 'Nunca es un hard-delete: marca la sociedad como DEPRECATED para preservar las afiliaciones y snapshots que ya la referencian.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la sociedad' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'La sociedad no existe' })
  deprecate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deprecate(id);
  }
}
