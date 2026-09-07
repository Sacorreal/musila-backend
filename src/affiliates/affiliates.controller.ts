import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AffiliatesService } from './affiliates.service';
import { AffiliateCommissionsService } from './affiliate-commissions.service';
import { AffiliateJwtAuthGuard } from './guards/affiliate-jwt-auth.guard';
import { CurrentAffiliate } from './decorators/current-affiliate.decorator';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';
import { LoginAffiliateDto } from './dto/login-affiliate.dto';
import { UpdateAffiliateProfileDto } from './dto/update-affiliate-profile.dto';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { AffiliateJwtPayload } from './interfaces/affiliate-jwt-payload.interface';

@ApiTags('Afiliados')
@Controller('affiliates')
export class AffiliatesController {
  constructor(
    private readonly affiliatesService: AffiliatesService,
    private readonly commissionsService: AffiliateCommissionsService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un nuevo afiliado',
    description: 'Crea una cuenta de afiliado independiente del core de la aplicación.',
  })
  async registerController(@Body() dto: RegisterAffiliateDto) {
    return this.affiliatesService.register(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Iniciar sesión como afiliado',
    description: 'Autentica con email y contraseña. Retorna un token JWT exclusivo de afiliados.',
  })
  async loginController(@Body() dto: LoginAffiliateDto) {
    return this.affiliatesService.login(dto);
  }

  @Get('me')
  @UseGuards(AffiliateJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getMeController(@CurrentAffiliate() affiliate: AffiliateJwtPayload) {
    return this.affiliatesService.getProfile(affiliate.id);
  }

  @Patch('me')
  @UseGuards(AffiliateJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateMeController(
    @CurrentAffiliate() affiliate: AffiliateJwtPayload,
    @Body() dto: UpdateAffiliateProfileDto,
  ) {
    return this.affiliatesService.updateProfile(affiliate.id, dto);
  }

  @Get('me/dashboard')
  @UseGuards(AffiliateJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getDashboardController(@CurrentAffiliate() affiliate: AffiliateJwtPayload) {
    return this.affiliatesService.getDashboard(affiliate.id);
  }

  @Get('me/referrals')
  @UseGuards(AffiliateJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getMyReferralsController(
    @CurrentAffiliate() affiliate: AffiliateJwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.affiliatesService.getReferrals(affiliate.id, pagination);
  }

  @Get('me/commissions')
  @UseGuards(AffiliateJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getMyCommissionsController(
    @CurrentAffiliate() affiliate: AffiliateJwtPayload,
    @Query() pagination: CommissionPaginationDto,
  ) {
    return this.commissionsService.findForAffiliate(affiliate.id, pagination);
  }
}
