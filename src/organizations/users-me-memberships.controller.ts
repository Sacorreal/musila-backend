import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { MembershipService } from './membership.service';

/** Memberships del usuario autenticado, para el switcher de organización del frontend. */
@ApiTags('Organizations · Mis memberships')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('users/me/memberships')
export class UsersMeMembershipsController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @ApiOperation({ summary: 'Memberships del usuario (staff y roster) con su organización' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.membershipService.findAllForUser(user.id);
  }
}
