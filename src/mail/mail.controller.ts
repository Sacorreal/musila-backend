import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';

@ApiTags('Correo Electrónico')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) { }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard)
  @Get('test-invite')
  @ApiOperation({
    summary: 'Enviar invitación de colaboración',
    description: 'Envía un correo electrónico de invitación para colaborar. Requiere autenticación y rol de cantautor o intérprete.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'Correo electrónico del destinatario',
    example: 'colaborador@example.com',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Correo de invitación enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Correo enviado a colaborador@example.com' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email no proporcionado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'No tiene el rol necesario (cantautor o intérprete)' })
  async testInvite(
    @Query('email') email: string,
    @CurrentUser([UserRole.CANTAUTOR, UserRole.INTERPRETE]) user: JwtPayload
  ) {

    if (!email) {
      throw new BadRequestException('Debe enviar el email por query')

    }

    await this.mailService.sendEmailCollaborationInviteService(
      email,
      user.id
    )

    return { message: `Correo enviado a ${email}` };
  }

  @Get('test-reset-password')
  @ApiOperation({
    summary: 'Probar envío de correo de recuperación de contraseña',
    description: 'Endpoint de prueba para enviar un correo electrónico de recuperación de contraseña. Solo para desarrollo/testing.',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'Correo electrónico del destinatario',
    example: 'usuario@example.com',
    type: String,
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
    type: String,
  })
  @ApiQuery({
    name: 'resetLink',
    required: true,
    description: 'Enlace para restablecer la contraseña',
    example: 'https://app.musila.com/reset-password?token=abc123',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Correo de recuperación enviado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Parámetros faltantes' })
  async testResetPasswordController(@Query('email') email: string, @Query('name') name: string, @Query('resetLink') resetLink: string) {
    return await this.mailService.sendPasswordResetEmailService(email, name, resetLink)
  }
}
