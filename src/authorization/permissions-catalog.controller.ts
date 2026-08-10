import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CapabilityService } from './capability.service';
import { RequireCapability } from './decorators/require-capability.decorator';
import { CapabilityCatalogQueryDto } from './dto/capability-catalog-query.dto';
import { AuthorizationGuard } from './guards/authorization.guard';

@ApiTags('Authorization · Catálogo de capabilities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('permissions')
export class PermissionsCatalogController {
  constructor(private readonly capabilityService: CapabilityService) {}

  @Get('catalog')
  @RequireCapability(
    ['organization.roles.manage', 'organization.roles.view', 'platform.settings.manage'],
    'OR',
  )
  @ApiOperation({
    summary: 'Consultar la MATRIZ DE CAPACIDADES',
    description:
      'Catálogo global de capabilities para construir dinámicamente la UI de administración de roles (§2). ' +
      'Filtrable por dominio, tipo de sujeto y tipo de organización.',
  })
  findCatalog(@Query() query: CapabilityCatalogQueryDto) {
    return this.capabilityService.findCatalog(query);
  }
}
