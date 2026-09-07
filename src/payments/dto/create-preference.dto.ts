import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';

export class CreatePreferenceDto {
  @ApiProperty({ enum: [UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360, UserPlanType.PLAN_DESCUBRIDOR] })
  @IsEnum([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360, UserPlanType.PLAN_DESCUBRIDOR])
  planType: UserPlanType;

  @ApiProperty({ enum: [UserPlan.PRO] })
  @IsEnum([UserPlan.PRO])
  plan: UserPlan.PRO;

  @ApiPropertyOptional({ enum: ['monthly', 'annual'], default: 'monthly' })
  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingPeriod?: 'monthly' | 'annual';
}
