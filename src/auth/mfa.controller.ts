import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JWTAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { MfaService } from './services/mfa.service';
import { TotpService } from './services/totp.service';
import { StepUpAuthService } from './services/step-up-auth.service';
import { ConfirmTotpDto, StepUpVerifyDto } from './dto/mfa.dto';

@ApiTags('MFA')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly totpService: TotpService,
    private readonly stepUpAuthService: StepUpAuthService,
  ) {}

  private uid(req: Request): string {
    return (req['user'] as JwtPayload).id;
  }

  @Get('status')
  @ApiOperation({ summary: 'Estado MFA del usuario (opcionalmente por organización)' })
  @ApiQuery({ name: 'organizationId', required: false })
  status(@Req() req: Request, @Query('organizationId') organizationId?: string) {
    return this.mfaService.getStatus(this.uid(req), organizationId);
  }

  // ── TOTP ───────────────────────────────────────────────────────────

  @Post('totp/setup')
  @Throttle({ long: { limit: 10, ttl: 600_000 } })
  @ApiOperation({ summary: 'Iniciar configuración de TOTP (devuelve QR)' })
  totpSetup(@Req() req: Request) {
    return this.totpService.setup(this.uid(req));
  }

  @Post('totp/confirm')
  @HttpCode(204)
  @Throttle({ long: { limit: 10, ttl: 600_000 } })
  @ApiOperation({ summary: 'Confirmar TOTP con un primer código válido' })
  async totpConfirm(
    @Req() req: Request,
    @Body() dto: ConfirmTotpDto,
    @Ip() ip: string,
  ) {
    await this.totpService.confirm(this.uid(req), dto.token, ip);
  }

  @Delete('totp')
  @HttpCode(204)
  @ApiOperation({ summary: 'Desactivar TOTP' })
  async totpDisable(@Req() req: Request, @Ip() ip: string) {
    await this.totpService.disable(this.uid(req), ip);
  }

  // ── Step-up ────────────────────────────────────────────────────────

  @Post('step-up/challenge')
  @ApiOperation({ summary: 'Generar challenge de step-up con Passkey' })
  stepUpChallenge(@Req() req: Request) {
    return this.stepUpAuthService.challengePasskey(this.uid(req));
  }

  @Post('step-up')
  @Throttle({ long: { limit: 20, ttl: 600_000 } })
  @ApiOperation({ summary: 'Verificar step-up (Passkey o TOTP) y emitir autorización temporal' })
  async stepUp(
    @Req() req: Request,
    @Body() dto: StepUpVerifyDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const userId = this.uid(req);
    const ctx = { ip, userAgent };

    if (dto.method === 'PASSKEY') {
      if (!dto.response) {
        throw new BadRequestException('Falta la aserción de Passkey');
      }
      return this.stepUpAuthService.verifyPasskey(userId, dto.scope, dto.response, ctx);
    }

    if (!dto.token) {
      throw new BadRequestException('Falta el código TOTP');
    }
    return this.stepUpAuthService.verifyTotp(userId, dto.scope, dto.token, ctx);
  }
}
