import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from 'src/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) { }

  async loginService({ email, password }: LoginAuthDto) {
    const user = await this.usersService['findUserByEmailForAuthService'](email);

    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Credenciales incorrectas');

    const token = await this.createToken(user);

    return { token };
  }

  async registerService(user: RegisterAuthDto, file?: Express.Multer.File) {
    const userExists = await this.usersService.findUserByEmailService(
      user.email,
    );

    if (userExists) throw new UnauthorizedException('El usuario ya existe');

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const newUser = await this.usersService.createUserService({
      ...user,
      password: hashedPassword
    },
      file
    );

    switch (newUser.role) {
      case UserRole.INTERPRETE:
      case UserRole.INVITADO:
        await this.mailService.sendWelcomeEmailService(newUser.email, newUser.name)
        break

      case UserRole.AUTOR:
        await this.mailService.sendWelcomeAutorEmailService(newUser.email, newUser.name)
        break

      case UserRole.CANTAUTOR:
        await this.mailService.sendWelcomeCantautorEmailService(newUser.email, newUser.name)
        break
    }


    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = newUser;

    return sanitizedUser;
  }

  private async createToken(user: User) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const token = await this.jwtService.signAsync(payload);

    return token;
  }

  async sendResetPasswordEmailService(forgotPassword: ForgotPasswordDto) {

    const { email } = forgotPassword

    const user = await this.usersService.findUserByEmailService(email)
    if (!user) throw new NotFoundException('No existe un usuario con ese email')

    const token = await this.jwtService.signAsync(
      { id: user.id },
      { expiresIn: '15m' }
    )

    const resetLink = `https://musila.co/reset-password?token=${token}`

    await this.mailService.sendPasswordResetEmailService(user.email, user.name, resetLink)

    return { message: 'Correo de recuperación enviado' }
  }

  async resetPasswordService(resetPassword: ResetPasswordDto) {

    const { token, newPassword } = resetPassword
    try {
      const decoded = await this.jwtService.verifyAsync(token)
      const user = await this.usersService.findOneUserByIdService(decoded.id)
      if (!user) throw new NotFoundException('Usuario no encontrado')

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await this.usersService.updateUserService(user.id, { password: hashedPassword })

      return { message: 'Contraseña actualizada correctamente' }

    } catch {
      throw new UnauthorizedException('Token inválido o expirado')
    }
  }

}
