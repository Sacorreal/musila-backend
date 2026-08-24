import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Length, Min } from 'class-validator';
import { BillingPeriod } from 'src/payments/entities/payment.entity';

export class SetPlanPriceDto {
  @ApiProperty({ example: 'COP' })
  @IsString()
  @Length(3, 10)
  currency: string;

  @ApiProperty({ example: 59900, description: 'Monto en centavos de la moneda' })
  @IsInt()
  @Min(0)
  amountInCents: number;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  @IsEnum(BillingPeriod)
  billingPeriod: BillingPeriod;
}
