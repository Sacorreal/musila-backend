import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { EntitlementService } from 'src/entitlements/entitlement.service';
import { MembershipService } from 'src/organizations/membership.service';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { AuthorizationService } from './authorization.service';
import { RequireCapability } from './decorators/require-capability.decorator';
import { AuthorizationCheckDto } from './dto/authorization-check.dto';
import { AuthorizationGuard } from './guards/authorization.guard';

/**
 * Authorization Explorer (§25): capabilities efectivas con su origen,
 * entitlements con consumo y simulador de checks con diagnóstico de DENY.
 */
@ApiTags('Authorization · Explorer (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/authorization')
export class AuthorizationAdminController {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly entitlementService: EntitlementService,
    private readonly membershipService: MembershipService,
  ) {}

  @Get('explain')
  @RequireCapability('platform.users.view')
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiOperation({
    summary: 'Capabilities efectivas de un usuario con su origen (Role → X / Plan → Y)',
  })
  async explain(
    @Query('userId') userId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const [explanation, memberships, entitlements] = await Promise.all([
      this.authorizationService.explain({ userId, organizationId: organizationId || undefined }),
      this.membershipService.findAllForUser(userId),
      this.entitlementService.getEffectiveEntitlements(
        organizationId
          ? this.entitlementService.organizationSubject(organizationId)
          : this.entitlementService.userSubject(userId),
      ),
    ]);

    return { ...explanation, memberships, entitlements };
  }

  @Post('check')
  @RequireCapability('platform.users.view')
  @AuditAction('authorization:check:simulate')
  @ApiOperation({
    summary: 'Simular un check de capability y obtener el diagnóstico ALLOW/DENY con su código',
  })
  async check(@Body() dto: AuthorizationCheckDto) {
    const decision = await this.authorizationService.check(
      { userId: dto.userId, organizationId: dto.organizationId },
      { caps: [dto.capability], operator: 'AND' },
    );
    return { capability: dto.capability, ...decision };
  }
}
