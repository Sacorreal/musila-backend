import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

import {RegisterGuestDto } from '../guests/dto/register-guest.dto'


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
  async registerController(@Body() user: RegisterAuthDto) {
    if (user.password !== user.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    return this.authService.registerService(user);
  }

  @Post('register/guest')
  async registerGuestController(
    @Body() guest: RegisterGuestDto
  ){
    return this.authService.registerGuestService(guest)
  }


}
