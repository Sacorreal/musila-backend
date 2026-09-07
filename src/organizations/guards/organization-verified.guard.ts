import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationStatus } from '../entities/organization-status.enum';
import { OrganizationsService } from '../organizations.service';

export const ORGANIZATION_NOT_VERIFIED_CODE = 'ORGANIZATION_NOT_VERIFIED';

/**
 * Exige que la organización del path (`:organizationId`) esté VERIFICADA
 * (§Registro Legal B2B, paso 7): sin este estado no puede crear staff ni
 * roster. Re-consulta la DB en cada request, igual que `LegalIdentityGuard`.
 * Responde 403 con `code: ORGANIZATION_NOT_VERIFIED` para que el frontend
 * redirija a la pantalla de activación en vez de mostrar un error genérico.
 */
@Injectable()
export class OrganizationVerifiedGuard implements CanActivate {
  constructor(private readonly organizationsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: { params?: Record<string, string> } = context.switchToHttp().getRequest();
    const organizationId = request.params?.organizationId;
    if (!organizationId) {
      throw new HttpException('Ruta sin organizationId', HttpStatus.BAD_REQUEST);
    }

    const organization = await this.organizationsService.findById(organizationId);
    if (organization.status !== OrganizationStatus.VERIFICADA) {
      throw new HttpException(
        {
          error: ORGANIZATION_NOT_VERIFIED_CODE,
          code: ORGANIZATION_NOT_VERIFIED_CODE,
          message: 'La organización debe completar su verificación antes de invitar staff o roster',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
