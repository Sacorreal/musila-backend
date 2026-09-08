import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { Repository } from 'typeorm';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Plan } from './entities/plan.entity';
import { SubjectType } from './entities/subject-type.enum';
import { Subscription } from './entities/subscription.entity';

@ApiTags('Entitlements · Subscriptions (admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('admin/subscriptions')
export class SubscriptionsAdminController {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly eventBus: EventBusService,
  ) {}

  @Get()
  @RequireCapability('platform.billing.view')
  @ApiQuery({ name: 'subjectType', required: false, enum: SubjectType })
  @ApiQuery({ name: 'subjectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'Listar subscriptions con filtros por sujeto y estado' })
  async findAll(
    @Query('subjectType') subjectType?: SubjectType,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (subjectType) where.subjectType = subjectType;
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;

    const [data, total] = await this.subscriptionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    return { data, total, page: Number(page) || 1, limit: take };
  }

  @Patch(':id')
  @RequireCapability('platform.billing.manage')
  @AuditAction('entitlements:subscription:update')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Cambio manual de plan/estado de una subscription (auditado)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubscriptionDto) {
    const subscription = await this.subscriptionRepository.findOne({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription no encontrada');

    if (dto.planId) {
      const plan = await this.planRepository.findOne({ where: { id: dto.planId } });
      if (!plan) throw new BadRequestException('El plan indicado no existe');
      subscription.planId = dto.planId;
    }
    if (dto.status) subscription.status = dto.status;
    if (dto.endAt !== undefined) subscription.endAt = dto.endAt ? new Date(dto.endAt) : null;

    const saved = await this.subscriptionRepository.save(subscription);

    this.eventBus.emit('authorization.subscription.updated', {
      subjectType: saved.subjectType,
      subjectId: saved.subjectId,
    });

    return this.subscriptionRepository.findOne({ where: { id } });
  }
}
