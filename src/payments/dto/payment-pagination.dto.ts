import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaymentStatus, PaymentProviderName, PaymentType } from '../entities/payment.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';

export class PaymentPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentProviderName })
  @IsOptional()
  @IsEnum(PaymentProviderName)
  provider?: PaymentProviderName;

  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @ApiPropertyOptional({ enum: UserPlan })
  @IsOptional()
  @IsEnum(UserPlan)
  billingTier?: UserPlan;

  @ApiPropertyOptional({ description: 'Filtrar por usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
