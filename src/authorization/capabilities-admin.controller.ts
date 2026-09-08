import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CapabilityService } from './capability.service';
import { RequireCapability } from './decorators/require-capability.decorator';
import { CapabilityCatalogQueryDto } from './dto/capability-catalog-query.dto';
import { UpdateCapabilityConfigDto } from './dto/update-capability-config.dto';
import { AuthorizationGuard } from './guards/authorization.guard';

/**
 * Administración de la MATRIZ DE CAPACIDADES desde el panel de Musila
 * (§19/§20): solo configuración (compatibilidad, estado, textos). Las keys
 * se crean únicamente por seeds versionados (§22).
 */
@ApiTags('Authorization · Matriz de capacidades (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/capabilities')
export class CapabilitiesAdminController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get()
  @RequireCapability('platform.settings.manage')
  @ApiOperation({ summary: 'Listar el catálogo completo (incluye inactivas)' })
  findAll(@Query() query: CapabilityCatalogQueryDto) {
    return this.capabilityService.findCatalog({ ...query, includeInactive: true });
  }

  @Patch(':id')
  @RequireCapability('platform.settings.manage')
  @AuditAction('authorization:capability:update')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Actualizar la configuración de una capability (no crea keys)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCapabilityConfigDto) {
    return this.capabilityService.updateConfig(id, dto);
  }
}
