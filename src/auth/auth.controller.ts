import { BadRequestException, Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

import {RegisterGuestDto } from '../guests/dto/register-guest.dto'
import { RegisterOrgAdminDto } from '../organizations/dto/register-org-admin.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';


@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @Throttle({ long: { limit: 15, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica un usuario con su correo electrónico y contraseña. Retorna un token JWT para acceder a los recursos protegidos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: { type: 'object' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async loginController(@Body() user: LoginAuthDto) {
    return await this.authService.loginService(user);
  }

  @Post('register')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crea una nueva cuenta de usuario en el sistema. Permite subir un avatar opcional.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: RegisterAuthDto })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o contraseñas no coinciden' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado' })
  async registerController(
    @Body() user: RegisterAuthDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (user.password !== user.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    return this.authService.registerService(user, ip, userAgent);
  }

  @Post('register/guest')
  async registerGuestController(
    @Body() guest: RegisterGuestDto
  ){
    return this.authService.registerGuestService(guest)
  }

  @Post('register/org-admin')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Registrar al Organization Admin desde una invitación',
    description:
      'Crea la cuenta del Organization Admin a partir del token de invitación recibido por email y lo activa como miembro con rol ORGANIZATION_ADMIN. Devuelve un JWT.',
  })
  @ApiResponse({ status: 201, description: 'Cuenta creada y membership activada' })
  @ApiResponse({ status: 400, description: 'Token inválido, email no coincide o contraseñas distintas' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado' })
  @ApiResponse({ status: 410, description: 'La invitación ha expirado' })
  async registerOrgAdminController(@Body() dto: RegisterOrgAdminDto) {
    return this.authService.registerOrgAdminFromInvite(dto);
  }

  @Post('forgot-password')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: 'Envía un enlace de recuperación al correo electrónico si existe.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada correctamente',
  })
  async requestPasswordReset(@Body() dto: RequestResetPasswordDto) {
    return this.authService.requestPasswordResetService(dto);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description: 'Restablece la contraseña utilizando el token enviado al correo electrónico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada correctamente',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o token expirado/inexistente' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordService(dto);
  }

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verificar correo electrónico',
    description: 'Marca la cuenta como verificada usando el token enviado por correo al registrarse.',
  })
  @ApiResponse({ status: 200, description: 'Correo verificado correctamente' })
  @ApiResponse({ status: 400, description: 'Token inválido' })
  @ApiResponse({ status: 410, description: 'El enlace de verificación ha expirado' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailService(dto);
  }

  @Post('resend-verification')
  @Throttle({ long: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Reenviar correo de verificación',
    description: 'Genera y envía un nuevo enlace de verificación si la cuenta existe y aún no está verificada.',
  })
  @ApiResponse({ status: 200, description: 'Solicitud procesada correctamente' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationService(dto);
  }
}
