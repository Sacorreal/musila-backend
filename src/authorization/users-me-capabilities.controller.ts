import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { AuthorizationService } from './authorization.service';
import { ORGANIZATION_ID_HEADER } from './utils/organization-context.util';

/**
 * Capabilities efectivas del usuario autenticado. Sin header
 * `x-organization-id` resuelve el contexto personal + plataforma (reemplazo
 * de GET /staff/members/me/permissions); con header, el contexto de esa
 * organización.
 */
@ApiTags('Authorization · Mis capabilities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('users/me/capabilities')
export class UsersMeCapabilitiesController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Get()
  @ApiHeader({ name: ORGANIZATION_ID_HEADER, required: false })
  @ApiOperation({ summary: 'Capabilities efectivas del usuario en el contexto actual' })
  async findMine(
    @CurrentUser() user: JwtPayload,
    @Headers(ORGANIZATION_ID_HEADER) organizationId?: string,
  ) {
    const capabilities = await this.authorizationService.getEffectiveCapabilityKeys({
      userId: user.id,
      organizationId: organizationId || undefined,
    });
    return { capabilities };
  }
}
