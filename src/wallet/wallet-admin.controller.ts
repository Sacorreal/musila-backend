import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireCapability } from 'src/authorization/decorators/require-capability.decorator';
import { AuthorizationGuard } from 'src/authorization/guards/authorization.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { WalletWithdrawalsService } from './services/wallet-withdrawals.service';
import { WithdrawalPaginationDto } from './dto/withdrawal-pagination.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';

@ApiTags('Wallet (Admin)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard, AuthorizationGuard)
@Controller('wallet/admin')
export class WalletAdminController {
  constructor(private readonly withdrawalsService: WalletWithdrawalsService) {}

  @Get('withdrawals')
  @RequireCapability('platform.billing.wallet.view')
  @ApiOperation({ summary: 'Listar solicitudes de retiro (Admin)' })
  findAll(@Query() pagination: WithdrawalPaginationDto) {
    return this.withdrawalsService.findAllAdmin(pagination);
  }

  @Get('withdrawals/:id')
  @RequireCapability('platform.billing.wallet.view')
  @ApiOperation({ summary: 'Detalle de una solicitud de retiro (Admin)' })
  findOne(@Param('id') id: string) {
    return this.withdrawalsService.findOneAdmin(id);
  }

  @Patch('withdrawals/:id/process')
  @RequireCapability('platform.billing.wallet.approve-withdrawal')
  @ApiOperation({ summary: 'Marcar una solicitud como "En proceso" (Admin)' })
  markInProcess(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.withdrawalsService.markInProcess(id, admin.id);
  }

  @Patch('withdrawals/:id/pay')
  @RequireCapability('platform.billing.wallet.approve-withdrawal')
  @ApiOperation({ summary: 'Marcar una solicitud como "Pagado" (Admin)' })
  markPaid(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.withdrawalsService.markPaid(id, admin.id);
  }

  @Patch('withdrawals/:id/reject')
  @RequireCapability('platform.billing.wallet.approve-withdrawal')
  @ApiOperation({ summary: 'Rechazar una solicitud de retiro (Admin)' })
  reject(@Param('id') id: string, @Body() dto: RejectWithdrawalDto, @CurrentUser() admin: JwtPayload) {
    return this.withdrawalsService.reject(id, admin.id, dto.reason);
  }
}
