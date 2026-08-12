import {
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
import { OrganizationInviteService } from 'src/organizations/organization-invite.service';
import { RegisterOrgAdminDto } from 'src/organizations/dto/register-org-admin.dto';
import { WorkspaceInviteService } from 'src/organizations/workspace-invite.service';
import { RegisterWorkspaceGuestDto } from 'src/organizations/dto/register-workspace-guest.dto';

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
    private readonly organizationInviteService: OrganizationInviteService,
    private readonly workspaceInviteService: WorkspaceInviteService,
  ) {}

  /**
   * Trampa de tiempo anti-bot: rechaza envíos que llegan antes de que un
   * humano razonablemente pudiera completar el formulario. Complementa al
   * honeypot `companyWebsite`. Usa el mismo mensaje genérico que este para
   * no revelar el mecanismo a un atacante.
   */
  private static readonly MIN_FORM_FILL_TIME_MS = 3000;

  private assertHumanTiming(formStartedAt?: number): void {
    if (formStartedAt === undefined) return;
    if (Date.now() - formStartedAt < AuthService.MIN_FORM_FILL_TIME_MS) {
      throw new BadRequestException('Solicitud inválida');
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
    this.assertHumanTiming(user.formStartedAt);

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
      formStartedAt: _formStartedAt, // solo para verificación de timing, nunca se persiste
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
   * Registro del Organization Admin a partir de una invitación por email:
   * valida el token, crea el usuario oficial (ya verificado, pues el email
   * fue validado por el token) y lo activa como miembro con rol
   * ORGANIZATION_ADMIN. Devuelve el JWT para iniciar sesión automáticamente.
   */
  async registerOrgAdminFromInvite(dto: RegisterOrgAdminDto) {
    if (dto.password !== dto.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');

    const invite = await this.organizationInviteService.validate(dto.token);
    if (invite.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new BadRequestException('El email no coincide con la invitación');
    }

    const emailExists = await this.usersService.findUserByEmailService(dto.email);
    if (emailExists) throw new ConflictException('Ya existe un usuario con este email');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.usersService.createUserService({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      countryCode: dto.countryCode,
      phone: dto.phone,
      typeCitizenID: dto.typeCitizenID,
      citizenID: dto.citizenID,
      // El email fue validado por el token de invitación: la cuenta nace verificada.
      isVerified: true,
    });

    const { organizationId } = await this.organizationInviteService.consumeForUser(
      dto.token,
      newUser.id,
    );

    const token = await this.createToken(newUser);
    return { token, organizationId };
  }

  /**
   * Registro de un invitado a partir de un enlace de workspace reutilizable:
   * valida el enlace, crea la cuenta (ya verificada, pues el email fue validado
   * implícitamente por el uso del enlace) y genera una solicitud de acceso
   * PENDING para que el administrador la apruebe. Devuelve el JWT para iniciar
   * sesión automáticamente; el usuario queda a la espera de aprobación.
   */
  async registerWorkspaceGuestFromLink(dto: RegisterWorkspaceGuestDto) {
    if (dto.password !== dto.repeatPassword)
      throw new BadRequestException('Las contraseñas no coinciden');

    const invite = await this.workspaceInviteService.validatePublic(dto.token);

    const emailExists = await this.usersService.findUserByEmailService(dto.email);
    if (emailExists) throw new ConflictException('Ya existe un usuario con este email');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.usersService.createUserService({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      typeCitizenID: dto.typeCitizenID,
      citizenID: dto.citizenID,
      // El email fue validado por el uso del enlace: la cuenta nace verificada.
      isVerified: true,
    });

    await this.workspaceInviteService.consumeForNewUser(dto.token, newUser.id);

    const token = await this.createToken(newUser);
    return { token, organizationId: invite.organizationId, status: 'PENDING' as const };
  }

  /**
   * Emite una sesión (JWT) para un usuario ya autenticado por Passkey (§11).
   * La verificación criptográfica la realiza `PasskeyService`; aquí solo se
   * reutiliza el mecanismo de sesión existente sin duplicar lógica de tokens.
   */
  async issuePasskeySession(userId: string): Promise<{ token: string }> {
    const user = await this.usersService.findOneUserService(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    const token = await this.createToken(user);
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
