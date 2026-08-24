import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { EntitlementService } from './entitlement.service';
import { Plan } from './entities/plan.entity';
import { SubjectType } from './entities/subject-type.enum';
import { UsageService } from './usage.service';

@ApiTags('Entitlements')
@ApiBearerAuth('JWT-auth')
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlementService: EntitlementService,
    private readonly usageService: UsageService,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  @Get('plans/business')
  @ApiOperation({
    summary: 'Planes B2B activos disponibles (público, para createBusinessForm)',
  })
  async findBusinessPlans() {
    const plans = await this.planRepository.find({
      where: { subjectType: SubjectType.ORGANIZATION, isActive: true },
      order: { name: 'ASC' },
    });
    return plans.map((plan) => ({
      key: plan.key,
      name: plan.name,
      description: plan.description ?? null,
      tier: plan.tier,
    }));
  }

  @Get('users/me/entitlements')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Entitlements efectivos del usuario con límite, consumo y remaining' })
  findMyEntitlements(@CurrentUser() user: JwtPayload) {
    return this.entitlementService.getEffectiveEntitlements(
      this.entitlementService.userSubject(user.id),
    );
  }

  @Get('users/me/usage')
  @UseGuards(JWTAuthGuard)
  @ApiOperation({ summary: 'Registros de consumo del usuario' })
  findMyUsage(@CurrentUser() user: JwtPayload) {
    return this.usageService.findForSubject(this.entitlementService.userSubject(user.id));
  }

  @Get('organizations/:organizationId/entitlements')
  @UseGuards(JWTAuthGuard, AuthorizationGuard)
  @RequireCapability(['billing.view', 'platform.billing.view'], 'OR')
  @ApiOperation({ summary: 'Entitlements efectivos de la organización (subscription B2B)' })
  findOrganizationEntitlements(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.entitlementService.getEffectiveEntitlements(
      this.entitlementService.organizationSubject(organizationId),
    );
  }
}
