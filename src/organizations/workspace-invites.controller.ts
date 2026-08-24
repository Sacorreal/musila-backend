import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { CreateInviteLinkDto } from './dto/create-invite-link.dto';
import { OrganizationVerifiedGuard } from './guards/organization-verified.guard';
import { WorkspaceInviteService } from './workspace-invite.service';

/**
 * Gestión del enlace de invitación reutilizable del workspace por parte del
 * administrador de la organización. Los permisos se evalúan server-side vía
 * `AuthorizationGuard` (§ requisito de seguridad).
 */
@ApiTags('Organizations · Enlace de invitación')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('organizations/:organizationId/invite-link')
export class WorkspaceInvitesController {
  constructor(private readonly workspaceInviteService: WorkspaceInviteService) {}

  @Get()
  @UseGuards(OrganizationVerifiedGuard)
  @RequireCapability('organization.members.manage')
  @ApiOperation({ summary: 'Obtener (o crear) el enlace de invitación activo del workspace' })
  getLink(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspaceInviteService.getOrCreateActiveLink(organizationId, user.id);
  }

  @Post('regenerate')
  @UseGuards(OrganizationVerifiedGuard)
  @RequireCapability('organization.members.manage')
  @AuditAction('organizations:invite-link:regenerate')
  @ApiOperation({ summary: 'Revocar el enlace actual y generar uno nuevo' })
  regenerate(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateInviteLinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspaceInviteService.regenerate(organizationId, user.id, dto);
  }

  @Post('revoke')
  @RequireCapability('organization.members.manage')
  @AuditAction('organizations:invite-link:revoke')
  @ApiOperation({ summary: 'Revocar el enlace de invitación activo' })
  async revoke(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    await this.workspaceInviteService.revoke(organizationId);
    return { revoked: true };
  }
}
