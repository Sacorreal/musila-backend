import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WorkspaceSecurityComplianceGuard } from 'src/auth/guards/workspace-security-compliance.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { BankAccountInput } from 'src/users/dto/bank-account.input';
import { WalletEarningsService } from './services/wallet-earnings.service';
import { WalletWithdrawalsService } from './services/wallet-withdrawals.service';
import { OrganizationBankAccountService } from './services/organization-bank-account.service';
import { EarningsPaginationDto } from './dto/earnings-pagination.dto';
import { WithdrawalPaginationDto } from './dto/withdrawal-pagination.dto';

/**
 * Wallet a nivel organización (publisher): balance, ganancias por comisión y
 * retiros. El `organizationId` de la ruta lo valida el `AuthorizationGuard`
 * contra la membership ACTIVE del usuario (tenant-aware). Los retiros ya no
 * se solicitan manualmente: se pagan automáticamente cada lunes
 * (`WalletAutoPayoutCron`), por lo que no hay endpoint para crearlos.
 */
@ApiTags('Wallet de Publisher')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard, WorkspaceSecurityComplianceGuard)
@Controller('organizations/:organizationId/wallet')
export class PublisherWalletController {
  constructor(
    private readonly earningsService: WalletEarningsService,
    private readonly withdrawalsService: WalletWithdrawalsService,
    private readonly bankAccountService: OrganizationBankAccountService,
  ) {}

  @Get('balance')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Saldo disponible de la wallet de la organización' })
  getBalance(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.earningsService.getOrganizationBalance(organizationId);
  }

  @Get('earnings')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Historial paginado de comisiones acreditadas' })
  getEarnings(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: EarningsPaginationDto,
  ) {
    return this.earningsService.getOrganizationEarningsHistory(organizationId, pagination);
  }

  @Get('withdrawals')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Historial paginado de retiros de la organización' })
  getWithdrawals(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() pagination: WithdrawalPaginationDto,
  ) {
    return this.withdrawalsService.findForOrganization(organizationId, pagination);
  }

  @Get('withdrawals/:id')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Detalle de un retiro de la organización' })
  getWithdrawal(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.withdrawalsService.findOneForOrganization(id, organizationId);
  }

  @Get('bank-account')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Cuenta bancaria de la organización' })
  getBankAccount(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.bankAccountService.get(organizationId);
  }

  @Put('bank-account')
  @RequireCapability('organization.settings.manage')
  @ApiOperation({ summary: 'Actualizar la cuenta bancaria de la organización' })
  updateBankAccount(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: BankAccountInput,
  ) {
    return this.bankAccountService.update(organizationId, dto);
  }
}
