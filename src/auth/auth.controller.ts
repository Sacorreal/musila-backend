import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
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
  @UseInterceptors(FileInterceptor('avatar'))
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
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', example: 'usuario@example.com' },
        name: { type: 'string', example: 'Juan' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o contraseñas no coinciden' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado' })
  async registerController(@Body() user: RegisterAuthDto, @UploadedFile() file?: Express.Multer.File) {
    if (user.password !== user.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');


    return this.authService.registerService(user, file);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: 'Envía un correo electrónico con un enlace para restablecer la contraseña del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Correo de recuperación enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Correo de recuperación enviado' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async forgotPasswordController(@Body() forgotPassword: ForgotPasswordDto) {

    return await this.authService.sendResetPasswordEmailService(forgotPassword)
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description: 'Restablece la contraseña del usuario usando el token recibido por correo electrónico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Contraseña restablecida correctamente' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPasswordController(@Body() resetPassword: ResetPasswordDto) {
    return this.authService.resetPasswordService(resetPassword)
  }
}
