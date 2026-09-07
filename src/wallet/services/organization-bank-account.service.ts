import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { UserBankAccount } from 'src/users/entities/user.entity';
import { BankAccountInput } from 'src/users/dto/bank-account.input';

/** Lectura/actualización de la cuenta bancaria de la organización (destino de sus retiros). */
@Injectable()
export class OrganizationBankAccountService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
  ) {}

  async get(organizationId: string): Promise<UserBankAccount | null> {
    const organization = await this.findOrThrow(organizationId);
    return organization.bankAccount ?? null;
  }

  async update(organizationId: string, dto: BankAccountInput): Promise<UserBankAccount> {
    const organization = await this.findOrThrow(organizationId);
    organization.bankAccount = { ...dto };
    await this.organizationRepo.save(organization);
    return organization.bankAccount;
  }

  private async findOrThrow(organizationId: string): Promise<Organization> {
    const organization = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Organización no encontrada');
    return organization;
  }
}
