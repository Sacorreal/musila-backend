import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { PublisherCoauthorService } from './publisher-coauthor.service';
import { UpsertRosterCoauthorDefaultsDto } from './dto/upsert-roster-coauthor-defaults.dto';

/**
 * Configuración de la coautoría por defecto de una publisher sobre su roster. El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware).
 */
@ApiTags('Coautoría por defecto de Publisher')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/coauthor-defaults')
export class PublisherCoauthorController {
  constructor(private readonly service: PublisherCoauthorService) {}

  @Get()
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Obtener la coautoría por defecto (roster con rol y porcentaje)' })
  getPolicy(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.getPolicy(organizationId);
  }

  @Put('roster')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Actualizar la coautoría por defecto del roster' })
  upsertRoster(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpsertRosterCoauthorDefaultsDto,
  ) {
    return this.service.upsertRosterDefaults(organizationId, dto.items);
  }
}
