import { ApiProperty } from '@nestjs/swagger';
import { OrganizationInviteStatus } from '../entities/organization-invite-status.enum';

/** Vista pública y segura de una invitación (no expone campos internos). */
export class OrganizationInviteResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty({ enum: OrganizationInviteStatus })
  status: OrganizationInviteStatus;

  @ApiProperty()
  expiresAt: Date;
}
