import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';

/** Aprobación de una solicitud de acceso: el administrador elige tipo y rol. */
export class ApproveAccessRequestDto {
  @ApiProperty({ enum: MembershipType, example: MembershipType.ORGANIZATION, description: 'Staff (ORGANIZATION) o roster (ROSTER)' })
  @IsNotEmpty()
  @IsEnum(MembershipType)
  membershipType: MembershipType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Rol a asignar dentro del tipo elegido' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;
}
