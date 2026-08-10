import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { RoleService } from 'src/authorization/role.service';
import { AuditAction } from 'src/staff-audit/decorators/audit-action.decorator';
import { StaffAuditInterceptor } from 'src/staff-audit/interceptors/staff-audit.interceptor';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import { ChangeMembershipStatusDto } from './dto/change-membership-status.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { MembersQueryDto } from './dto/members-query.dto';
import { SetMembershipRolesDto } from 'src/authorization/dto/set-membership-roles.dto';
import { MembershipService } from './membership.service';
import { OrganizationsService } from './organizations.service';

/**
 * Gestión de memberships (staff y roster) de una organización, y de sus
 * roles. Aislamiento por tenant: toda membership se verifica contra la
 * organización del path antes de operar (§14).
 */
@ApiTags('Organizations · Miembros')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('organizations/:organizationId/members')
export class OrganizationMembersController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly organizationsService: OrganizationsService,
    private readonly roleService: RoleService,
  ) {}

  @Get()
  @RequireCapability(
    ['organization.members.view', 'roster.view', 'platform.organizations.view'],
    'OR',
  )
  @ApiOperation({ summary: 'Listar miembros (staff o roster) de la organización' })
  findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: MembersQueryDto,
  ) {
    return this.membershipService.findMembersOfOrganization(
      organizationId,
      query.type ?? MembershipType.ORGANIZATION,
    );
  }

  @Post()
  @RequireCapability(['organization.members.manage', 'roster.manage'], 'OR')
  @AuditAction('organizations:member:invite')
  @ApiOperation({
    summary: 'Invitar a un usuario como staff o roster (queda INVITED hasta que acepte)',
  })
  invite(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.membershipService.invite({
      type: dto.type,
      organizationId,
      userId: dto.userId,
      invitedBy: user.id,
    });
  }

  @Post(':membershipId/accept')
  @ApiParam({ name: 'membershipId' })
  @ApiOperation({ summary: 'Aceptar la invitación (solo el usuario invitado)' })
  async accept(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const resolved = await this.resolveMembershipInOrganization(organizationId, membershipId);
    return this.membershipService.accept(resolved.type, membershipId, user.id);
  }

  @Patch(':membershipId/status')
  @RequireCapability(['organization.members.manage', 'roster.manage'], 'OR')
  @AuditAction('organizations:member:status')
  @ApiParam({ name: 'membershipId' })
  @ApiOperation({ summary: 'Suspender, reactivar o retirar una membership' })
  async changeStatus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: ChangeMembershipStatusDto,
  ) {
    const resolved = await this.resolveMembershipInOrganization(organizationId, membershipId);
    return this.membershipService.changeStatus(resolved.type, membershipId, dto.status);
  }

  @Get(':membershipId/roles')
  @RequireCapability(
    ['organization.members.view', 'roster.view', 'platform.organizations.view'],
    'OR',
  )
  @ApiParam({ name: 'membershipId' })
  @ApiOperation({ summary: 'Roles asignados a una membership' })
  async getRoles(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    const resolved = await this.resolveMembershipInOrganization(organizationId, membershipId);
    return this.roleService.getMembershipRoles(resolved.type, membershipId);
  }

  @Put(':membershipId/roles')
  @RequireCapability(['organization.members.manage', 'roster.manage'], 'OR')
  @AuditAction('organizations:member:roles:set')
  @ApiParam({ name: 'membershipId' })
  @ApiOperation({ summary: 'Reemplazar los roles de una membership (multi-rol permitido)' })
  async setRoles(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: SetMembershipRolesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const resolved = await this.resolveMembershipInOrganization(organizationId, membershipId);
    const organization = await this.organizationsService.findById(organizationId);
    return this.roleService.setMembershipRoles(
      organization,
      resolved.type,
      membershipId,
      dto.roleIds,
      user.id,
      resolved.userId,
    );
  }

  private async resolveMembershipInOrganization(
    organizationId: string,
    membershipId: string,
  ): Promise<{ type: MembershipType; userId: string }> {
    const resolved = await this.membershipService.resolveById(membershipId);
    if (!resolved) {
      throw new NotFoundException('Membership no encontrada');
    }
    if (resolved.membership.organizationId !== organizationId) {
      throw new ForbiddenException('La membership no pertenece a esta organización');
    }
    return { type: resolved.type, userId: resolved.membership.userId };
  }
}
