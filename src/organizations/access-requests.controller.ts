import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { AccessRequestService } from './access-request.service';
import { AccessRequestQueryDto } from './dto/access-request-query.dto';
import { ApproveAccessRequestDto } from './dto/approve-access-request.dto';
import { RejectAccessRequestDto } from './dto/reject-access-request.dto';
import { OrganizationVerifiedGuard } from './guards/organization-verified.guard';

/**
 * Panel de solicitudes de acceso al workspace: consulta de pendientes y
 * resolución (aprobar asignando tipo + rol, o rechazar). Aislamiento por
 * organización: toda solicitud se verifica contra la organización del path.
 */
@ApiTags('Organizations · Solicitudes de acceso')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('organizations/:organizationId/access-requests')
export class AccessRequestsController {
  constructor(private readonly accessRequestService: AccessRequestService) {}

  @Get()
  @RequireCapability('organization.members.manage')
  @ApiOperation({ summary: 'Listar solicitudes de acceso (por defecto todas; filtrable por estado)' })
  findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: AccessRequestQueryDto,
  ) {
    return this.accessRequestService.findByOrganization(organizationId, query.status);
  }

  @Post(':requestId/approve')
  @UseGuards(OrganizationVerifiedGuard)
  @RequireCapability('organization.members.manage')
  @AuditAction('organizations:access-request:approve')
  @ApiParam({ name: 'requestId' })
  @ApiOperation({ summary: 'Aprobar una solicitud asignando tipo (staff/roster) y rol' })
  approve(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ApproveAccessRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accessRequestService.approve(organizationId, requestId, dto, user.id);
  }

  @Post(':requestId/reject')
  @RequireCapability('organization.members.manage')
  @AuditAction('organizations:access-request:reject')
  @ApiParam({ name: 'requestId' })
  @ApiOperation({ summary: 'Rechazar una solicitud de acceso' })
  reject(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RejectAccessRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accessRequestService.reject(organizationId, requestId, dto.reason, user.id);
  }
}
