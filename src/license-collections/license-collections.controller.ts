import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { LicenseCollectionsService } from './license-collections.service';
import { CreateLicenseCollectionDto } from './dto/create-license-collection.dto';
import { LicenseCollectionPaginationDto } from './dto/license-collection-pagination.dto';

/**
 * Gestión de cobros de anticipo de licencias de primer uso.
 * Solo el administrador registra y opera estos cobros; el envío del enlace de
 * pago y el marcado de vencimiento ocurren automáticamente vía scheduler.
 */
@ApiTags('Gestión de Cobros (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('license-collections')
export class LicenseCollectionsController {
  constructor(private readonly collectionsService: LicenseCollectionsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Registrar un cobro de anticipo para una licencia de primer uso' })
  async create(@Body() dto: CreateLicenseCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar cobros con filtros por estado, fecha y licencia asociada' })
  async findAll(@Query() pagination: LicenseCollectionPaginationDto) {
    return this.collectionsService.findAllPaginated(pagination);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener el detalle de un cobro' })
  async findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Post(':id/retry')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reintentar manualmente el envío del enlace de pago' })
  async retry(@Param('id') id: string) {
    return this.collectionsService.retrySend(id);
  }

  @Post(':id/regenerate-link')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Regenerar el enlace de pago (p. ej. expiró o el pago fue rechazado)' })
  async regenerateLink(@Param('id') id: string) {
    return this.collectionsService.regenerateLink(id);
  }
}
