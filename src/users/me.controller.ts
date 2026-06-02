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
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { UpdateMeDto } from './dto/update-me.dto';
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
  @ApiOperation({ summary: 'Cambiar correo electrónico' })
  changeEmail(@Req() req: Request, @Body() dto: ChangeEmailDto) {
    const ip = req.ip || req.socket?.remoteAddress;
    return this.meService.changeEmail(this.uid(req), dto, ip);
  }

  @Patch('password')
  @HttpCode(204)
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
  @ApiOperation({ summary: 'Actualizar datos de facturación' })
  updateBilling(@Req() req: Request, @Body() dto: UpdateBillingDto) {
    return this.meService.updateBilling(this.uid(req), dto);
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
