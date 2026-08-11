import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationInviteResponseDto } from './dto/organization-invite-response.dto';
import { OrganizationInviteService } from './organization-invite.service';

/**
 * Endpoint público (sin JWT) para validar el token de invitación antes de
 * mostrar el formulario de registro del Organization Admin. El token actúa
 * como mecanismo de autorización.
 */
@ApiTags('Organizations · Invitaciones')
@Controller('organization-invites')
export class OrganizationInvitesController {
  constructor(private readonly organizationInviteService: OrganizationInviteService) {}

  @Get(':token')
  @ApiParam({ name: 'token', description: 'Token de invitación (hex 64 chars)' })
  @ApiOperation({
    summary: 'Validar una invitación de organización',
    description: 'Verifica que el token exista, esté pendiente y no haya expirado. No requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Invitación válida', type: OrganizationInviteResponseDto })
  @ApiResponse({ status: 400, description: 'Invitación ya utilizada o revocada' })
  @ApiResponse({ status: 404, description: 'Invitación no encontrada' })
  @ApiResponse({ status: 410, description: 'Invitación expirada' })
  validate(@Param('token') token: string): Promise<OrganizationInviteResponseDto> {
    return this.organizationInviteService.validate(token);
  }
}
