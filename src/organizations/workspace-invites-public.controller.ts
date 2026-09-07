import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceInviteService } from './workspace-invite.service';

/**
 * Endpoint público (sin JWT) para validar el enlace de invitación del workspace
 * antes de mostrar el formulario de registro. El token actúa como mecanismo de
 * autorización.
 */
@ApiTags('Organizations · Enlace de invitación')
@Controller('workspace-invites')
export class WorkspaceInvitesPublicController {
  constructor(private readonly workspaceInviteService: WorkspaceInviteService) {}

  @Get(':token')
  @ApiParam({ name: 'token', description: 'Token del enlace de invitación' })
  @ApiOperation({
    summary: 'Validar un enlace de invitación de workspace',
    description:
      'Verifica que el enlace exista, esté activo, no haya expirado y tenga usos disponibles. No requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Enlace válido; devuelve datos de la organización' })
  @ApiResponse({ status: 400, description: 'Enlace revocado' })
  @ApiResponse({ status: 404, description: 'Enlace no encontrado' })
  @ApiResponse({ status: 410, description: 'Enlace expirado o sin usos disponibles' })
  validate(@Param('token') token: string) {
    return this.workspaceInviteService.validatePublic(token);
  }
}
