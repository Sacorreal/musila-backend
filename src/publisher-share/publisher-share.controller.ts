import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { PublisherShareService } from './publisher-share.service';
import { UpsertPublisherSharesDto } from './dto/upsert-publisher-shares.dto';

/**
 * Configuración del Publisher's Share de una publisher sobre su roster. El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware).
 */
@ApiTags("Publisher's Share")
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/publisher-shares')
export class PublisherShareController {
  constructor(private readonly service: PublisherShareService) {}

  @Get()
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: "Obtener el Publisher's Share (roster con porcentaje)" })
  getPolicy(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.getPolicy(organizationId);
  }

  @Put('roster')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: "Actualizar el Publisher's Share del roster" })
  upsertRoster(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpsertPublisherSharesDto,
  ) {
    return this.service.upsertShares(organizationId, dto.items);
  }
}
