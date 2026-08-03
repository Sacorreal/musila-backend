import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { AffiliatesAdminService } from './affiliates-admin.service';
import { AffiliatePaginationDto } from './dto/affiliate-pagination.dto';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';
import { UpdateAffiliateStatusDto } from './dto/update-affiliate-status.dto';
import { UpdateAffiliateTierDto } from './dto/update-affiliate-tier.dto';
import { RejectCommissionDto } from './dto/reject-commission.dto';
import { CreateAffiliateAdminDto } from './dto/create-affiliate-admin.dto';

@ApiTags('Afiliados (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('affiliates/admin')
export class AffiliatesAdminController {
  constructor(private readonly adminService: AffiliatesAdminService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  async findAllController(@Query() pagination: AffiliatePaginationDto) {
    return this.adminService.findAll(pagination);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  async createController(@Body() dto: CreateAffiliateAdminDto) {
    return this.adminService.create(dto);
  }

  @Get('commissions')
  @ApiBearerAuth('JWT-auth')
  async findAllCommissionsController(@Query() pagination: CommissionPaginationDto) {
    return this.adminService.findAllCommissions(pagination);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  async findOneController(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id/status')
  @ApiBearerAuth('JWT-auth')
  async updateStatusController(@Param('id') id: string, @Body() dto: UpdateAffiliateStatusDto) {
    return this.adminService.updateStatus(id, dto);
  }

  @Patch(':id/tier')
  @ApiBearerAuth('JWT-auth')
  async updateTierController(@Param('id') id: string, @Body() dto: UpdateAffiliateTierDto) {
    return this.adminService.updateTier(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  async removeController(@Param('id') id: string) {
    await this.adminService.remove(id);
  }

  @Patch('commissions/:id/pay')
  @ApiBearerAuth('JWT-auth')
  async payCommissionController(@Param('id') id: string) {
    return this.adminService.payCommission(id);
  }

  @Patch('commissions/:id/reject')
  @ApiBearerAuth('JWT-auth')
  async rejectCommissionController(@Param('id') id: string, @Body() dto: RejectCommissionDto) {
    return this.adminService.rejectCommission(id, dto.reason);
  }
}
