import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { OrganizationSecurityPolicyService } from './organization-security-policy.service';
import { UpdateSecurityPolicyDto } from './dto/update-security-policy.dto';

/**
 * Administración de la política de seguridad de una organización (§4). El
 * `organizationId` de la ruta lo valida el `AuthorizationGuard` contra la
 * membership ACTIVE del usuario (tenant-aware). Autorización y autenticación
 * permanecen desacopladas: aquí solo se decide quién puede editar la política.
 */
@ApiTags('Seguridad de Organización')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('organizations/:organizationId/security-policy')
export class OrganizationSecurityPolicyController {
  constructor(private readonly service: OrganizationSecurityPolicyService) {}

  @Get()
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Obtener la política de seguridad de la organización' })
  get(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.get(organizationId);
  }

  @Put()
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Actualizar la política de seguridad de la organización' })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateSecurityPolicyDto,
  ) {
    return this.service.update(organizationId, dto);
  }
}
