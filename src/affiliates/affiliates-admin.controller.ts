import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { AffiliatesAdminService } from './affiliates-admin.service';
import { AffiliatePaginationDto } from './dto/affiliate-pagination.dto';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';
import { UpdateAffiliateStatusDto } from './dto/update-affiliate-status.dto';
import { UpdateAffiliateTierDto } from './dto/update-affiliate-tier.dto';
import { RejectCommissionDto } from './dto/reject-commission.dto';
import { CreateAffiliateAdminDto } from './dto/create-affiliate-admin.dto';

@ApiTags('Afiliados (Admin)')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('affiliates/admin')
export class AffiliatesAdminController {
  constructor(private readonly adminService: AffiliatesAdminService) {}

  @Get()
  @RequireCapability('platform.billing.affiliates.manage')
  @ApiBearerAuth('JWT-auth')
  async findAllController(@Query() pagination: AffiliatePaginationDto) {
    return this.adminService.findAll(pagination);
  }

  @Post()
  @RequireCapability('platform.billing.affiliates.manage')
  @ApiBearerAuth('JWT-auth')
  async createController(@Body() dto: CreateAffiliateAdminDto) {
    return this.adminService.create(dto);
  }

  @Get('commissions')
  @RequireCapability('platform.billing.commissions.manage')
  @ApiBearerAuth('JWT-auth')
  async findAllCommissionsController(@Query() pagination: CommissionPaginationDto) {
    return this.adminService.findAllCommissions(pagination);
  }

  @Get(':id')
  @RequireCapability('platform.billing.affiliates.manage')
  @ApiBearerAuth('JWT-auth')
  async findOneController(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id/status')
  @RequireCapability('platform.billing.affiliates.manage')
  @ApiBearerAuth('JWT-auth')
  async updateStatusController(@Param('id') id: string, @Body() dto: UpdateAffiliateStatusDto) {
    return this.adminService.updateStatus(id, dto);
  }

  @Patch(':id/tier')
  @RequireCapability('platform.billing.affiliates.manage')
  @ApiBearerAuth('JWT-auth')
  async updateTierController(@Param('id') id: string, @Body() dto: UpdateAffiliateTierDto) {
    return this.adminService.updateTier(id, dto);
  }

  @Delete(':id')
  @RequireCapability('platform.billing.affiliates.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  async removeController(@Param('id') id: string) {
    await this.adminService.remove(id);
  }

  @Patch('commissions/:id/pay')
  @RequireCapability('platform.billing.commissions.manage')
  @ApiBearerAuth('JWT-auth')
  async payCommissionController(@Param('id') id: string) {
    return this.adminService.payCommission(id);
  }

  @Patch('commissions/:id/reject')
  @RequireCapability('platform.billing.commissions.manage')
  @ApiBearerAuth('JWT-auth')
  async rejectCommissionController(@Param('id') id: string, @Body() dto: RejectCommissionDto) {
    return this.adminService.rejectCommission(id, dto.reason);
  }
}
