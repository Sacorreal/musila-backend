import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JWTAuthGuard } from './guards/jwt-auth.guard';
import { StepUpGuard } from './guards/step-up.guard';
import { RequireStepUp } from './decorators/require-step-up.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { PasskeyService } from './services/passkey.service';
import {
  RenamePasskeyDto,
  VerifyPasskeyAuthenticationDto,
  VerifyPasskeyRegistrationDto,
} from './dto/passkey.dto';

@ApiTags('Passkeys')
@Controller('auth/passkeys')
export class PasskeyController {
  constructor(
    private readonly passkeyService: PasskeyService,
    private readonly authService: AuthService,
  ) {}

  private uid(req: Request): string {
    return (req['user'] as JwtPayload).id;
  }

  // ── Registro (autenticado) ─────────────────────────────────────────

  @Post('register/options')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @Throttle({ long: { limit: 10, ttl: 600_000 } })
  @ApiOperation({ summary: 'Generar opciones para registrar una Passkey' })
  registerOptions(@Req() req: Request) {
    return this.passkeyService.generateRegistrationOptions(this.uid(req));
  }

  @Post('register/verify')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @Throttle({ long: { limit: 10, ttl: 600_000 } })
  @ApiOperation({ summary: 'Verificar y guardar la Passkey registrada' })
  @ApiResponse({ status: 201, description: 'Passkey registrada' })
  registerVerify(
    @Req() req: Request,
    @Body() dto: VerifyPasskeyRegistrationDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.passkeyService.verifyRegistration(this.uid(req), dto.response, dto.name, {
      ip,
      userAgent,
    });
  }

  // ── Login (público) ────────────────────────────────────────────────

  @Post('login/options')
  @Throttle({ long: { limit: 20, ttl: 600_000 } })
  @ApiOperation({ summary: 'Generar opciones para iniciar sesión con Passkey' })
  loginOptions() {
    return this.passkeyService.generateAuthenticationOptions();
  }

  @Post('login/verify')
  @Throttle({ long: { limit: 20, ttl: 600_000 } })
  @ApiOperation({ summary: 'Verificar la Passkey e iniciar sesión' })
  @ApiResponse({ status: 201, description: 'Sesión iniciada; retorna token JWT' })
  async loginVerify(
    @Body() dto: VerifyPasskeyAuthenticationDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const { userId } = await this.passkeyService.verifyAuthentication(dto.response, {
      ip,
      userAgent,
    });
    return this.authService.issuePasskeySession(userId);
  }

  // ── Gestión (autenticado) ──────────────────────────────────────────

  @Get()
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar las Passkeys activas del usuario' })
  list(@Req() req: Request) {
    return this.passkeyService.list(this.uid(req));
  }

  @Post(':id/rename')
  @UseGuards(JWTAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renombrar una Passkey' })
  rename(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenamePasskeyDto,
    @Ip() ip: string,
  ) {
    return this.passkeyService.rename(this.uid(req), id, dto.name, { ip });
  }

  @Delete(':id')
  @UseGuards(JWTAuthGuard, StepUpGuard)
  @RequireStepUp('account.passkey.revoke')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Revocar una Passkey' })
  async revoke(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const userId = this.uid(req);
    await this.passkeyService.revoke(userId, id, userId, { ip, userAgent });
  }
}
