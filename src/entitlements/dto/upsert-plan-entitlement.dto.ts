import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { EntitlementPeriod } from '../entities/entitlement-period.enum';

export class UpsertPlanEntitlementDto {
  @ApiProperty({ example: 5, nullable: true, description: 'null cuando unlimited=true' })
  @ValidateIf((dto: UpsertPlanEntitlementDto) => !dto.unlimited)
  @IsInt()
  @Min(0)
  @IsOptional()
  limit: number | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  unlimited: boolean;

  @ApiProperty({ enum: EntitlementPeriod, example: EntitlementPeriod.LIFETIME })
  @IsEnum(EntitlementPeriod)
  period: EntitlementPeriod;
}
