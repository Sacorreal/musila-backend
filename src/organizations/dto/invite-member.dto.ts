import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';

export class InviteMemberDto {
  @ApiProperty({ enum: MembershipType, example: MembershipType.ROSTER })
  @IsEnum(MembershipType)
  type: MembershipType;

  @ApiProperty({ description: 'Usuario a invitar' })
  @IsUUID()
  userId: string;
}
