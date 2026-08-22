import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSocietyAffiliationDto } from './create-society-affiliation.dto';
import { SocietyAffiliationVerificationStatus } from '../entities/society-affiliation-verification-status.enum';

export class UpdateSocietyAffiliationDto extends PartialType(CreateSocietyAffiliationDto) {
  @ApiPropertyOptional({
    enum: SocietyAffiliationVerificationStatus,
    description: 'Solo staff puede pasar `VERIFIED`/`REJECTED`; el autor autodeclara UNVERIFIED/DECLARED/DOCUMENT_SUPPORTED.',
  })
  @IsOptional()
  @IsEnum(SocietyAffiliationVerificationStatus)
  verificationStatus?: SocietyAffiliationVerificationStatus;
}
