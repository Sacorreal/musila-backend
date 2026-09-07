import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateCommissionsService } from './affiliate-commissions.service';
import { AffiliatesService } from './affiliates.service';
import { AffiliatePaginationDto } from './dto/affiliate-pagination.dto';
import { CommissionPaginationDto } from './dto/commission-pagination.dto';
import { UpdateAffiliateStatusDto } from './dto/update-affiliate-status.dto';
import { UpdateAffiliateTierDto } from './dto/update-affiliate-tier.dto';
import { CreateAffiliateAdminDto } from './dto/create-affiliate-admin.dto';

@Injectable()
export class AffiliatesAdminService {
  constructor(
    @InjectRepository(Affiliate)
    private readonly affiliateRepo: Repository<Affiliate>,
    private readonly commissionsService: AffiliateCommissionsService,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  async create(dto: CreateAffiliateAdminDto): Promise<Affiliate> {
    return this.affiliatesService.createByAdmin(dto);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.affiliateRepo.softDelete(id);
  }

  async findAll(pagination: AffiliatePaginationDto) {
    const { limit = 10, offset = 0, status, tier, q } = pagination;
    const qb = this.affiliateRepo.createQueryBuilder('affiliate').take(limit).skip(offset);

    if (status) qb.andWhere('affiliate.status = :status', { status });
    if (tier) qb.andWhere('affiliate.tier = :tier', { tier });
    if (q) {
      qb.andWhere(
        '(affiliate.name ILIKE :q OR affiliate.lastName ILIKE :q OR affiliate.email ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    qb.orderBy('affiliate.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  async findOne(id: string) {
    const affiliate = await this.affiliateRepo.findOne({ where: { id } });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');
    return affiliate;
  }

  async updateStatus(id: string, dto: UpdateAffiliateStatusDto) {
    await this.findOne(id);
    await this.affiliateRepo.update(id, { status: dto.status });
    return this.findOne(id);
  }

  async updateTier(id: string, dto: UpdateAffiliateTierDto) {
    await this.findOne(id);
    await this.affiliateRepo.update(id, { tier: dto.tier });
    return this.findOne(id);
  }

  async findAllCommissions(pagination: CommissionPaginationDto) {
    return this.commissionsService.findAllForAdmin(pagination);
  }

  async payCommission(id: string) {
    return this.commissionsService.markPaid(id);
  }

  async rejectCommission(id: string, reason: string) {
    return this.commissionsService.reject(id, reason);
  }
}
