import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export class CreatePsePaymentDto {
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

  @ApiProperty({ description: 'Correo del pagador' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Nombre del pagador' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'Apellido del pagador' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: ['individual', 'association'], description: 'Tipo de persona' })
  @IsEnum(['individual', 'association'])
  entityType: 'individual' | 'association';

  @ApiProperty({ enum: ['CC', 'CE', 'NIT', 'TI', 'PP'], description: 'Tipo de documento' })
  @IsEnum(['CC', 'CE', 'NIT', 'TI', 'PP'])
  identificationType: 'CC' | 'CE' | 'NIT' | 'TI' | 'PP';

  @ApiProperty({ description: 'Número de documento' })
  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @ApiProperty({ description: 'Código de la entidad bancaria PSE' })
  @IsString()
  @IsNotEmpty()
  financialInstitution: string;
}
