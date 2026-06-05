import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { GuestsService } from 'src/guests/guests.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Guest } from 'src/guests/entities/guest.entity';
import { RegisterGuestDto } from '../guests/dto/register-guest.dto';
import * as crypto from 'crypto';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly guestsService: GuestsService,
    private readonly jwtService: JwtService,
    private readonly eventBus: EventBusService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Login unificado para User y Guest usando citizenID.
   *
   * Flujo de resolución:
   * 1. Busca en tabla `users` (User).
   * 2. Si no lo encuentra, busca en tabla `guest` (Guest).
   * 3. Valida contraseña.
   */
  async loginService(dto: LoginAuthDto): Promise<{ token: string }> {
    const { citizenID, password } = dto;

    // 1. Intentar encontrar en la tabla de Usuarios regulares
    let account: User | Guest | null =
      await this.usersService.findUserBycitizenIDService(citizenID);

    // 2. Si no se encuentra, intentar encontrar en la tabla de Invitados
    if (!account) {
      account = await this.guestsService.findGuestByCitizenIDForAuth(citizenID);
    }

    // 3. Validar existencia y contraseña
    if (!account || !account.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // 4. Generar token
    const token = await this.createToken(account);

    return { token };
  }

  async registerService(user: RegisterAuthDto) {
    const userExists = await this.usersService.findUserBycitizenIDService(
      user.citizenID,
    );

    if (userExists) throw new UnauthorizedException('El usuario ya existe');

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const { externalReference, ...userFields } = user;

    const newUser = await this.usersService.createUserService({
      ...userFields,
      password: hashedPassword,
    });

    if (externalReference) {
      await this.paymentsService.linkUserToPayment(externalReference, newUser.id);
    }

    const token = await this.createToken(newUser);

    return { token };
  }

  async registerGuestService(guest: RegisterGuestDto) {
    if (guest.password !== guest.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');
    const newGuest = await this.guestsService.registerFromInvite(guest);
    const token = await this.createToken(newGuest);
    return { token };
  }

  /**
   * Genera token JWT unificado para User o Guest.
   */
  private async createToken(account: User | Guest): Promise<string> {
    const payload: JwtPayload = {
      id: account.id,
      email: account.email,
      role: account.role,
      name: account.name,
      plan: 'plan' in account ? (account).plan : undefined,
    };
    return this.jwtService.signAsync(payload);
  }

  async requestPasswordResetService(dto: RequestResetPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findUserByEmailService(dto.email);

    // Siempre devolvemos el mismo mensaje para no revelar si el email existe
    const successMessage = 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña';

    if (!user) {
      return { message: successMessage };
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.usersService.saveResetToken(user.id, resetToken, resetTokenExpires);

    this.eventBus.emit('user.password.reset.requested', {
      email: user.email,
      name: user.name,
      token: resetToken,
    });

    return { message: successMessage };
  }

  async resetPasswordService(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const user = await this.usersService.findUserByResetToken(dto.token);

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
      throw new BadRequestException('El token ha expirado');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.resetPassword(user.id, hashedPassword);

    this.eventBus.emit('user.password.changed', {
      email: user.email,
      name: user.name,
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
