import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateCommissionsService } from './affiliate-commissions.service';
import { RegisterAffiliateDto } from './dto/register-affiliate.dto';
import { LoginAffiliateDto } from './dto/login-affiliate.dto';
import { UpdateAffiliateProfileDto } from './dto/update-affiliate-profile.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { generateReferralCode } from './utils/generate-referral-code.util';
import { maskEmail } from './utils/mask-email.util';
import { AFFILIATE_JWT_SERVICE } from './providers/affiliate-jwt.provider';
import { AffiliateJwtPayload } from './interfaces/affiliate-jwt-payload.interface';

@Injectable()
export class AffiliatesService {
  private readonly logger = new Logger(AffiliatesService.name);

  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepo: Repository<Affiliate>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(AFFILIATE_JWT_SERVICE)
    private readonly affiliateJwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly commissionsService: AffiliateCommissionsService,
  ) {}

  private webAppUrl(): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'local');
    const key =
      nodeEnv === 'production'
        ? 'WEB_APP_PRODUCTION'
        : nodeEnv === 'development'
          ? 'WEB_APP_DEVELOPMENT'
          : 'WEB_APP_LOCAL';
    return this.configService.get<string>(key, 'http://localhost:3000');
  }

  private async createToken(affiliate: Affiliate): Promise<string> {
    const payload: AffiliateJwtPayload = {
      id: affiliate.id,
      email: affiliate.email,
      name: affiliate.name,
      tier: affiliate.tier,
      status: affiliate.status,
      type: 'affiliate',
    };
    return this.affiliateJwtService.signAsync(payload);
  }

  private async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateReferralCode();
      const exists = await this.affiliateRepo.exist({ where: { referralCode: code } });
      if (!exists) return code;
    }
    throw new ConflictException('No se pudo generar un código de referido único, intenta de nuevo');
  }

  async register(dto: RegisterAffiliateDto): Promise<{ token: string }> {
    if (dto.password !== dto.repeatPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const existing = await this.affiliateRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Ya existe un afiliado registrado con este correo');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const referralCode = await this.generateUniqueReferralCode();

    const affiliate = await this.affiliateRepo.save({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      countryCode: dto.countryCode,
      companyOrBrand: dto.companyOrBrand,
      website: dto.website,
      audienceDescription: dto.audienceDescription,
      socialNetworks: dto.socialNetworks,
      paymentPhone: dto.paymentPhone,
      bankAccount: dto.bankAccount,
      referralCode,
      acceptedTermsAt: dto.acceptedTerms ? new Date() : undefined,
    });

    this.logger.log(`[Affiliates] nuevo afiliado registrado: ${affiliate.email}`);
    const token = await this.createToken(affiliate);
    return { token };
  }

  async login(dto: LoginAffiliateDto): Promise<{ token: string }> {
    const affiliate = await this.affiliateRepo
      .createQueryBuilder('affiliate')
      .addSelect('affiliate.password')
      .where('affiliate.email = :email', { email: dto.email })
      .getOne();

    if (!affiliate) throw new UnauthorizedException('Credenciales incorrectas');

    const isMatch = await bcrypt.compare(dto.password, affiliate.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales incorrectas');

    const token = await this.createToken(affiliate);
    return { token };
  }

  /**
   * Vincula un nuevo usuario del core con el afiliado que lo refirió.
   * Llamado desde AuthService.registerService() — nunca bloquea el registro si falla.
   */
  async attributeReferral(userId: string, referralCode: string): Promise<void> {
    const affiliate = await this.affiliateRepo.findOne({ where: { referralCode } });
    if (!affiliate) {
      this.logger.warn(`[Affiliates] código de referido inválido: ${referralCode}`);
      return;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    if (user.email === affiliate.email) {
      this.logger.warn(`[Affiliates] auto-referido bloqueado para ${user.email}`);
      return;
    }

    await this.userRepo.update(userId, {
      referredByAffiliateId: affiliate.id,
      referredAt: new Date(),
    });
    this.logger.log(`[Affiliates] usuario ${userId} atribuido a afiliado ${affiliate.id}`);
  }

  async getProfile(affiliateId: string) {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new UnauthorizedException();
    return this.toProfileDto(affiliate);
  }

  async updateProfile(affiliateId: string, dto: UpdateAffiliateProfileDto) {
    await this.affiliateRepo.update(affiliateId, dto);
    return this.getProfile(affiliateId);
  }

  private toProfileDto(affiliate: Affiliate) {
    return {
      id: affiliate.id,
      name: affiliate.name,
      lastName: affiliate.lastName,
      email: affiliate.email,
      phone: affiliate.phone,
      companyOrBrand: affiliate.companyOrBrand,
      website: affiliate.website,
      audienceDescription: affiliate.audienceDescription,
      socialNetworks: affiliate.socialNetworks,
      paymentPhone: affiliate.paymentPhone,
      bankAccount: affiliate.bankAccount,
      tier: affiliate.tier,
      status: affiliate.status,
      referralCode: affiliate.referralCode,
      referralLink: `${this.webAppUrl()}/?ref=${affiliate.referralCode}`,
      createdAt: affiliate.createdAt,
    };
  }

  async getDashboard(affiliateId: string) {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId } });
    if (!affiliate) throw new UnauthorizedException();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalReferrals, referralsThisMonth, recentUsers, kpis, recentCommissions] =
      await Promise.all([
        this.userRepo.count({ where: { referredByAffiliateId: affiliateId } }),
        this.userRepo
          .createQueryBuilder('u')
          .where('u.referredByAffiliateId = :affiliateId', { affiliateId })
          .andWhere('u.createdAt >= :monthStart', { monthStart })
          .getCount(),
        this.userRepo.find({
          where: { referredByAffiliateId: affiliateId },
          order: { createdAt: 'DESC' },
          take: 5,
        }),
        this.commissionsService.getKpisForAffiliate(affiliateId),
        this.commissionsService.findRecentForAffiliate(affiliateId),
      ]);

    const convertedUserIds = new Set(
      (await this.commissionsService.findForAffiliate(affiliateId, { limit: 1000, offset: 0 }))
        .data.filter((c) => c.isFirstPurchase)
        .map((c) => c.referredUserId),
    );

    return {
      affiliate: this.toProfileDto(affiliate),
      kpis: {
        totalReferrals,
        referralsThisMonth,
        conversionRate: totalReferrals > 0 ? kpis.convertedReferrals / totalReferrals : 0,
        ...kpis,
      },
      recentReferrals: recentUsers.map((u) => ({
        userId: u.id,
        firstName: u.name,
        emailMasked: maskEmail(u.email),
        registeredAt: u.createdAt,
        converted: convertedUserIds.has(u.id),
      })),
      recentCommissions: recentCommissions.map((c) => ({
        id: c.id,
        type: c.commissionType,
        status: c.status,
        saleAmount: Number(c.saleAmount),
        commissionAmount: Number(c.commissionAmount),
        createdAt: c.createdAt,
        approvalDueAt: c.approvalDueAt,
      })),
    };
  }

  async getReferrals(affiliateId: string, pagination: PaginationDto) {
    const { limit = 10, offset = 0 } = pagination;
    const [users, total] = await this.userRepo.findAndCount({
      where: { referredByAffiliateId: affiliateId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const allCommissions = (
      await this.commissionsService.findForAffiliate(affiliateId, { limit: 1000, offset: 0 })
    ).data;
    const convertedUserIds = new Set(
      allCommissions.filter((c) => c.isFirstPurchase).map((c) => c.referredUserId),
    );

    const data = users.map((u) => ({
      userId: u.id,
      firstName: u.name,
      emailMasked: maskEmail(u.email),
      registeredAt: u.createdAt,
      converted: convertedUserIds.has(u.id),
    }));

    return { data, total, limit, offset };
  }
}
