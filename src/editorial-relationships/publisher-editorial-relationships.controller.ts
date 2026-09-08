import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { EditorialRelationshipsService } from './editorial-relationships.service';
import { EditorialRelationshipDto } from './dto/editorial-relationship-response.dto';

@ApiTags('Relación Editora-Autor')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@Controller('organizations/:organizationId/editorial-relationships')
export class PublisherEditorialRelationshipsController {
  constructor(private readonly service: EditorialRelationshipsService) {}

  @Get()
  @RequireCapability(['organization.settings.manage', 'organization.members.view'], 'OR')
  @ApiOperation({ summary: 'Historial de relaciones editora-autor del roster de la organización (Flow 3)' })
  getForOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<EditorialRelationshipDto[]> {
    return this.service.getForOrganization(organizationId);
  }
}
