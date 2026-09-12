import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { AuditLogService } from './audit-log.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { UpdatePersonalBankAccountInput } from './dto/update-personal-bank-account.input';
import { UserBankAccount } from './entities/user.entity';
import { LegalIdentityService } from 'src/legal-identity/legal-identity.service';
import { UpsertLegalIdentityDto } from 'src/legal-identity/dto/upsert-legal-identity.dto';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLog: AuditLogService,
    private readonly legalIdentityService: LegalIdentityService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateMeDto) {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async changeEmail(userId: string, dto: ChangeEmailDto, ip?: string) {
    const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('El correo ya está en uso');
    }
    await this.userRepo.update(userId, { email: dto.newEmail });
    await this.auditLog.log(userId, 'email_changed', { newEmail: dto.newEmail }, ip);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { password: hashed });
    await this.auditLog.log(userId, 'password_changed', undefined, ip);
  }

  async updateAvatar(userId: string, avatarUrl: string, avatarKey?: string) {
    await this.userRepo.update(userId, { avatarUrl, ...(avatarKey && { avatarKey }) });
    return this.getProfile(userId);
  }

  async getBilling(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['fiscalName', 'taxId', 'fiscalAddress'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return { fiscalName: user.fiscalName, taxId: user.taxId, fiscalAddress: user.fiscalAddress };
  }

  async updateBilling(userId: string, dto: UpdateBillingDto, ip?: string) {
    await this.userRepo.update(userId, dto);
    await this.auditLog.log(userId, 'billing_updated', undefined, ip);
    return this.getBilling(userId);
  }

  async getBankAccount(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'bankAccount'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user.bankAccount ?? null;
  }

  /**
   * El titular/tipo de documento/número de documento NO vienen del cliente:
   * se derivan de la identidad legal ya verificada del usuario (misma
   * persona, mismo documento — no tiene sentido volver a pedirlo aquí y
   * arriesgar que quede desincronizado). Por eso exige identidad legal
   * completa antes de permitir guardar la cuenta bancaria personal.
   */
  async updateBankAccount(userId: string, dto: UpdatePersonalBankAccountInput) {
    const legalIdentity = await this.legalIdentityService.getDecryptedByUserId(userId);
    if (!legalIdentity) {
      throw new BadRequestException(
        'Debes completar tu identidad legal antes de configurar tus datos bancarios',
      );
    }

    const accountHolderName = [
      legalIdentity.primerNombre,
      legalIdentity.segundoNombre,
      legalIdentity.primerApellido,
      legalIdentity.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');

    const bankAccount: UserBankAccount = {
      bankCode: dto.bankCode,
      bankName: dto.bankName,
      accountType: dto.accountType,
      accountNumber: dto.accountNumber,
      accountHolderName,
      accountHolderIdType: legalIdentity.tipoIdentificacion,
      accountHolderIdNumber: legalIdentity.numeroIdentificacion,
    };

    await this.userRepo.update(userId, { bankAccount });
    return this.getBankAccount(userId);
  }

  // ── Identidad legal (Ley 527 / Ley 1581) ────────────────

  getLegalIdentity(userId: string) {
    return this.legalIdentityService.getDecryptedByUserId(userId);
  }

  async updateLegalIdentity(userId: string, dto: UpsertLegalIdentityDto) {
    await this.legalIdentityService.upsert(userId, dto);
    return this.getProfile(userId);
  }

  private sanitize(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, resetToken, resetTokenExpires, ...safe } = user as any;
    return safe;
  }
}
