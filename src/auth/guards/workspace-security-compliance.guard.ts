import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { MembershipService } from 'src/organizations/membership.service';
import { AuditLogService } from 'src/users/audit-log.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';
import { MfaService } from '../services/mfa.service';

export const SECURITY_POLICY_NOT_SATISFIED_CODE = 'SECURITY_POLICY_NOT_SATISFIED';

/**
 * Bloquea el acceso al workspace protegido de una organización (B2B, §3.2) o
 * a las rutas de staff de Musila (§3.3) cuando la política de seguridad de la
 * organización no está satisfecha. Reutiliza `MfaService.evaluateCompliance`
 * sin duplicar reglas: el staff es, en BD, una `OrganizationMembership` ACTIVE
 * contra la organización del tenant PLATFORM, así que la misma evaluación
 * cubre ambos casos.
 *
 * Toma `organizationId` de `request.params.organizationId` (rutas B2B, mismo
 * patrón que `OrganizationVerifiedGuard`); si la ruta no lo lleva (rutas
 * `*-admin` de staff, sin `:organizationId` en el path), lo resuelve vía la
 * membership de plataforma del usuario. Si no es ni miembro B2B ni staff,
 * deja pasar: este guard no es de autorización, `AuthorizationGuard`/
 * `@RequireCapability` ya filtran quién puede llegar aquí.
 */
@Injectable()
export class WorkspaceSecurityComplianceGuard implements CanActivate {
  constructor(
    private readonly mfaService: MfaService,
    private readonly membershipService: MembershipService,
    private readonly auditLog: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload; params: Record<string, string> }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const organizationId = await this.resolveOrganizationId(user.id, request.params);
    if (!organizationId) return true;

    const { satisfied, missing } = await this.mfaService.evaluateCompliance(
      user.id,
      organizationId,
    );
    if (!satisfied) {
      await this.auditLog.log(user.id, 'SECURITY_POLICY_BLOCKED_ACCESS', {
        organizationId,
        missing,
        path: request.path,
      });
      throw new HttpException(
        {
          error: SECURITY_POLICY_NOT_SATISFIED_CODE,
          code: SECURITY_POLICY_NOT_SATISFIED_CODE,
          message:
            'Debes completar los requisitos de seguridad de esta organización antes de continuar',
          missing,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private async resolveOrganizationId(
    userId: string,
    params: Record<string, string>,
  ): Promise<string | undefined> {
    if (params?.organizationId) return params.organizationId;

    const platformMemberships = await this.membershipService.findActivePlatformMemberships(
      userId,
    );
    return platformMemberships[0]?.organizationId;
  }
}
