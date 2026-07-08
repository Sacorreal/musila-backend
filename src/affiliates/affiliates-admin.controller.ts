import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/users/guards/roles.guard';
import { Roles } from 'src/users/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user-role.enum';
import { AffiliatesAdminService } from './affiliates-admin.service';
import { AffiliatePaginationDto } from './dto/affiliate-pagination.dto';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';
import { UpdateAffiliateStatusDto } from './dto/update-affiliate-status.dto';
import { UpdateAffiliateTierDto } from './dto/update-affiliate-tier.dto';
import { RejectCommissionDto } from './dto/reject-commission.dto';

@ApiTags('Afiliados (Admin)')
@UseGuards(JWTAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('affiliates/admin')
export class AffiliatesAdminController {
  constructor(private readonly adminService: AffiliatesAdminService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  async findAllController(@Query() pagination: AffiliatePaginationDto) {
    return this.adminService.findAll(pagination);
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
