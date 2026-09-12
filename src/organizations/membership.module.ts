import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { MembershipService } from './membership.service';

/**
 * Global porque WorkspaceSecurityComplianceGuard (auth/guards) se aplica vía
 * @UseGuards(WorkspaceSecurityComplianceGuard) en ~25 controllers de módulos
 * no relacionados entre sí (publisher-share, wallet, blog, promotions...).
 * Nest instancia ese guard en el contexto del módulo dueño de cada controller,
 * así que MembershipService debe ser resoluble desde cualquiera de ellos sin
 * que cada uno tenga que importar este módulo explícitamente — igual que
 * EventBusModule para EventBusService.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMembership, RosterMembership])],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
