import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MembershipStatus } from '../entities/membership-status.enum';

const ALLOWED_TRANSITIONS = [
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
  MembershipStatus.REMOVED,
] as const;

export class ChangeMembershipStatusDto {
  @ApiProperty({ enum: ALLOWED_TRANSITIONS, example: MembershipStatus.SUSPENDED })
  @IsIn(ALLOWED_TRANSITIONS)
  status: (typeof ALLOWED_TRANSITIONS)[number];
}
