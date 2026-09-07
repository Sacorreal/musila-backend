import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { OtpVerificationService } from './otp-verification.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpClientPlatform } from './otp-client-platform.type';

@ApiTags('OTP')
@ApiBearerAuth()
@UseGuards(JWTAuthGuard)
@Controller('otp')
export class OtpVerificationController {
  constructor(private readonly otpVerificationService: OtpVerificationService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Solicitar código OTP',
    description:
      'Genera y envía un código OTP para autorizar una acción sensible (aprobar solicitud, firmar/pagar licencia). El canal se determina automáticamente según el cliente que hace la petición.',
  })
  @ApiResponse({ status: 201, description: 'Código enviado' })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-client-platform') clientPlatform?: string,
  ) {
    const platform: OtpClientPlatform = clientPlatform === 'mobile' ? 'mobile' : 'web';
    return this.otpVerificationService.requestOtp(user.id, dto.purpose, dto.entityId, platform);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verificar código OTP' })
  @ApiResponse({ status: 201, description: 'Código verificado' })
  @ApiResponse({ status: 400, description: 'Código incorrecto, expirado o intentos agotados' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @CurrentUser() user: JwtPayload) {
    return this.otpVerificationService.verifyOtp(user.id, dto.purpose, dto.entityId, dto.code);
  }
}
