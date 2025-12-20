import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) { }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('test-invite')
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
  async testResetPasswordController(@Query('email') email: string, @Query('name') name: string, @Query('resetLink') resetLink: string) {
    return await this.mailService.sendPasswordResetEmailService(email, name, resetLink)
  }
}
