import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { UpdateTrackspaceDto } from './dto/update-trackspace.dto';
import { OrganizationsService } from './organizations.service';

/** Personalización del workspace: nombre y logo por organización (§2). */
@ApiTags('Organizations · Workspace')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('organizations/:organizationId/trackspaces')
export class TrackspacesController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequireCapability(
    ['organization.settings.manage', 'organization.members.view', 'platform.organizations.view'],
    'OR',
  )
  @ApiOperation({ summary: 'Listar los trackspaces de la organización' })
  findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.findTrackspaces(organizationId);
  }

  @Patch(':trackspaceId')
  @RequireCapability('organization.settings.manage')
  @AuditAction('organizations:trackspace:update')
  @ApiParam({ name: 'trackspaceId' })
  @ApiOperation({ summary: 'Personalizar nombre y logo del workspace' })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('trackspaceId', ParseUUIDPipe) trackspaceId: string,
    @Body() dto: UpdateTrackspaceDto,
  ) {
    return this.organizationsService.updateTrackspace(organizationId, trackspaceId, dto);
  }
}
