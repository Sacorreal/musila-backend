import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export class CreateCheckoutDto {
  @ApiProperty({ enum: [UserRole.AUTOR, UserRole.CANTAUTOR, UserRole.INTERPRETE] })
  @IsEnum([UserRole.AUTOR, UserRole.CANTAUTOR, UserRole.INTERPRETE])
  role: UserRole;

  @ApiProperty({ enum: [UserPlan.PRO] })
  @IsEnum([UserPlan.PRO])
  plan: UserPlan.PRO;

  @ApiPropertyOptional({ enum: ['monthly', 'annual'], default: 'monthly' })
  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingPeriod?: 'monthly' | 'annual';

  @ApiPropertyOptional({ description: 'Correo del comprador para la transacción' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}
