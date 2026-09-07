import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';

export class MembersQueryDto {
  @ApiPropertyOptional({ enum: MembershipType, default: MembershipType.ORGANIZATION })
  @IsOptional()
  @IsEnum(MembershipType)
  type?: MembershipType;
}
