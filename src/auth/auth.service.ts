import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { GuestsService } from 'src/guests/guests.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { AuditLogService } from 'src/users/audit-log.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Guest } from 'src/guests/entities/guest.entity';
import { RegisterGuestDto } from '../guests/dto/register-guest.dto';
import * as crypto from 'crypto';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { AffiliatesService } from 'src/affiliates/affiliates.service';

const EMAIL_VERIFICATION_EXPIRATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly guestsService: GuestsService,
    private readonly jwtService: JwtService,
    private readonly eventBus: EventBusService,
    private readonly paymentsService: PaymentsService,
    private readonly affiliatesService: AffiliatesService,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Verifica el token del widget de Cloudflare Turnstile contra su API.
   * Se ejecuta antes de cualquier consulta a la base de datos para descartar
   * tráfico de bots lo más barato posible.
   */
  private async verifyTurnstileToken(token: string, ip: string): Promise<void> {
    const secret = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    if (!secret) {
      this.logger.error('TURNSTILE_SECRET_KEY no está configurado');
      throw new BadRequestException('Verificación anti-bot no disponible, intenta más tarde');
    }

    const params = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const result = (await response.json()) as { success: boolean };

    if (!result.success) {
      throw new BadRequestException('No se pudo verificar que eres humano, intenta de nuevo');
    }
  }

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

  async registerService(user: RegisterAuthDto, ip: string, userAgent?: string) {
    await this.verifyTurnstileToken(user.turnstileToken, ip);

    const userExists = await this.usersService.findUserBycitizenIDService(
      user.citizenID,
    );
    if (userExists) throw new UnauthorizedException('El usuario ya existe');

    const emailExists = await this.usersService.findUserByEmailService(user.email);
    if (emailExists) throw new ConflictException('Ya existe un usuario con este email');

    const hashedPassword = await bcrypt.hash(user.password, 10);
    const {
      externalReference,
      referralCode,
      companyWebsite: _companyWebsite, // honeypot: nunca se persiste
      turnstileToken: _turnstileToken, // solo para verificación, nunca se persiste
      ...userFields
    } = user;

    const newUser = await this.usersService.createUserService({
      ...userFields,
      password: hashedPassword,
      // isVerified nunca se toma del cliente: siempre arranca sin verificar.
      isVerified: false,
    });

    if (externalReference) {
      await this.paymentsService.linkUserToPayment(externalReference, newUser.id);
    }

    if (referralCode) {
      try {
        await this.affiliatesService.attributeReferral(newUser.id, referralCode);
      } catch (err: any) {
        this.logger.warn(`No se pudo atribuir el referido: ${err?.message}`);
      }
    }

    await this.auditLogService.log(newUser.id, 'user.registered', { userAgent }, ip);
    await this.sendEmailVerification(newUser.id, newUser.email, newUser.name);

    const token = await this.createToken(newUser);

    return { token };
  }

  /** Genera y envía el token de verificación de email (24h de validez). */
  private async sendEmailVerification(userId: string, email: string, name: string): Promise<void> {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRATION_MS);

    await this.usersService.saveEmailVerificationToken(userId, verificationToken, expires);

    this.eventBus.emit('user.email.verification.requested', {
      email,
      name,
      token: verificationToken,
    });
  }

  async verifyEmailService(dto: VerifyEmailDto): Promise<{ message: string }> {
    const user = await this.usersService.findUserByEmailVerificationToken(dto.token);

    if (!user) {
      throw new BadRequestException('Token inválido');
    }
    if (user.isVerified) {
      return { message: 'Tu correo ya estaba verificado' };
    }
    if (
      user.emailVerificationTokenExpires &&
      user.emailVerificationTokenExpires < new Date()
    ) {
      throw new GoneException('El enlace de verificación ha expirado, solicita uno nuevo');
    }

    await this.usersService.markEmailAsVerified(user.id);

    return { message: 'Correo verificado correctamente' };
  }

  async resendVerificationService(dto: ResendVerificationDto): Promise<{ message: string }> {
    const successMessage = 'Si el correo existe y no ha sido verificado, se ha enviado un nuevo enlace';
    const user = await this.usersService.findUserByEmailService(dto.email);

    if (!user || user.isVerified) {
      return { message: successMessage };
    }

    await this.sendEmailVerification(user.id, user.email, user.name);

    return { message: successMessage };
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
      planType: account.planType,
      name: account.name,
      plan: 'plan' in account ? (account).plan : undefined,
      isVerified: account.isVerified,
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
