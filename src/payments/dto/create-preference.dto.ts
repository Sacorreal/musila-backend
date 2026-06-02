import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export class CreatePreferenceDto {
  @ApiProperty({ enum: [UserRole.AUTOR, UserRole.CANTAUTOR, UserRole.INTERPRETE] })
  @IsEnum([UserRole.AUTOR, UserRole.CANTAUTOR, UserRole.INTERPRETE])
  role: UserRole;

  @ApiProperty({ enum: [UserPlan.PRO] })
  @IsEnum([UserPlan.PRO])
  plan: UserPlan.PRO;
}
