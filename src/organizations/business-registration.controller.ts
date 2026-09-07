import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';

/**
 * Autoservicio de la organización durante su propio onboarding
 * (§Registro Legal B2B, pasos 5-7): activar el primer perfil de
 * administrador y verificar si ya cumple todos los requisitos. Solo
 * requiere sesión (no `platform.organizations.manage`) — el actor es la
 * propia organización, no el admin de Musila.
 */
@ApiTags('Organizations · Onboarding')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('organizations')
export class BusinessRegistrationController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':organizationId')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({ summary: 'Detalle de la organización propia durante su onboarding' })
  async getOwnOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.findById(organizationId);
    if (organization.registeredByUserId !== user.id) {
      throw new ForbiddenException('No tienes acceso a esta organización');
    }
    return organization;
  }

  @Post(':organizationId/activate-admin')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({
    summary: 'Activar el primer perfil de administrador (§5)',
    description:
      'Solo quien envió el createBusinessForm puede activarse como Organization Admin, una vez la organización está CREADA. Idempotente.',
  })
  activateAdmin(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.organizationsService.activateOrganizationAdmin(organizationId, user.id);
  }

  @Post(':organizationId/check-verification')
  @ApiParam({ name: 'organizationId' })
  @ApiOperation({
    summary: 'Verificar si la organización cumple todos los requisitos (§7)',
    description:
      'Idempotente: si CREADA y tiene un Organization Admin con identidad legal verificada, transiciona a VERIFICADA y arranca la suscripción.',
  })
  checkVerification(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.organizationsService.checkAndVerifyOrganization(organizationId);
  }
}
