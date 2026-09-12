import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';
import { Request } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { StepUpGuard } from 'src/auth/guards/step-up.guard';
import { RequireStepUp } from 'src/auth/decorators/require-step-up.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdatePersonalBankAccountInput } from './dto/update-personal-bank-account.input';
import { UpsertLegalIdentityDto } from 'src/legal-identity/dto/upsert-legal-identity.dto';
import { MeService } from './me.service';
import { PlanService } from './plan.service';

class UpdateAvatarDto {
  @ApiProperty({ description: 'URL pública del avatar ya subido a S3/R2' })
  @IsString() @IsUrl() avatarUrl: string;
  @ApiProperty({ required: false }) @IsString() avatarKey?: string;
}

@ApiTags('Mi Cuenta')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('users/me')
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly planService: PlanService,
  ) {}

  private uid(req: Request): string {
    return (req['user'] as JwtPayload).id;
  }

  // ── Perfil ──────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getProfile(@Req() req: Request) {
    return this.meService.getProfile(this.uid(req));
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar datos básicos del perfil' })
  updateProfile(@Req() req: Request, @Body() dto: UpdateMeDto) {
    return this.meService.updateProfile(this.uid(req), dto);
  }

  @Patch('email')
  @UseGuards(StepUpGuard)
  @RequireStepUp('account.change_email')
  @ApiOperation({ summary: 'Cambiar correo electrónico' })
  changeEmail(@Req() req: Request, @Body() dto: ChangeEmailDto) {
    const ip = req.ip || req.socket?.remoteAddress;
    return this.meService.changeEmail(this.uid(req), dto, ip);
  }

  @Patch('password')
  @HttpCode(204)
  @UseGuards(StepUpGuard)
  @RequireStepUp('account.change_password')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const ip = req.ip || req.socket?.remoteAddress;
    await this.meService.changePassword(this.uid(req), dto, ip);
  }

  @Patch('avatar')
  @ApiOperation({ summary: 'Actualizar foto de perfil (URL ya subida a S3/R2)' })
  updateAvatar(@Req() req: Request, @Body() dto: UpdateAvatarDto) {
    return this.meService.updateAvatar(this.uid(req), dto.avatarUrl, dto.avatarKey);
  }

  // ── Plan ────────────────────────────────────────────────

  @Get('plan')
  @ApiOperation({ summary: 'Obtener estado del plan activo' })
  getPlanStatus(@Req() req: Request) {
    return this.planService.getPlanStatus(this.uid(req));
  }

  // ── Facturación ─────────────────────────────────────────

  @Get('billing')
  @ApiOperation({ summary: 'Obtener datos de facturación' })
  getBilling(@Req() req: Request) {
    return this.meService.getBilling(this.uid(req));
  }

  @Patch('billing')
  @UseGuards(StepUpGuard)
  @RequireStepUp('account.billing.update')
  @ApiOperation({ summary: 'Actualizar datos de facturación' })
  updateBilling(@Req() req: Request, @Body() dto: UpdateBillingDto) {
    const ip = req.ip || req.socket?.remoteAddress;
    return this.meService.updateBilling(this.uid(req), dto, ip);
  }

  // ── Datos bancarios (placeholder para retiros de Wallet) ─

  @Get('bank-account')
  @ApiOperation({ summary: 'Obtener datos bancarios guardados' })
  getBankAccount(@Req() req: Request) {
    return this.meService.getBankAccount(this.uid(req));
  }

  @Patch('bank-account')
  @UseGuards(StepUpGuard)
  @RequireStepUp('account.bank_account.update')
  @ApiOperation({ summary: 'Guardar/actualizar datos bancarios (el titular se deriva de la identidad legal)' })
  updateBankAccount(@Req() req: Request, @Body() dto: UpdatePersonalBankAccountInput) {
    return this.meService.updateBankAccount(this.uid(req), dto);
  }

  // ── Identidad legal (Ley 527 / Ley 1581) ────────────────

  @Get('legal-identity')
  @ApiOperation({ summary: 'Obtener el estado y los datos de identidad legal registrados' })
  getLegalIdentity(@Req() req: Request) {
    return this.meService.getLegalIdentity(this.uid(req));
  }

  @Patch('legal-identity')
  @ApiOperation({ summary: 'Registrar o actualizar la identidad legal (verifica al usuario)' })
  updateLegalIdentity(@Req() req: Request, @Body() dto: UpsertLegalIdentityDto) {
    return this.meService.updateLegalIdentity(this.uid(req), dto);
  }

  // ── Historial de pagos ──────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'Historial de pagos paginado' })
  getPaymentHistory(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.planService.getPaymentHistory(
      this.uid(req),
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      status as any,
      from,
      to,
    );
  }
}
