import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { WalletEarningsService } from './services/wallet-earnings.service';
import { WalletWithdrawalsService } from './services/wallet-withdrawals.service';
import { EarningsPaginationDto } from './dto/earnings-pagination.dto';
import { WithdrawalPaginationDto } from './dto/withdrawal-pagination.dto';

/**
 * Los retiros ya no se solicitan manualmente: el saldo disponible se paga
 * automáticamente cada lunes (`WalletAutoPayoutCron`). Este controlador solo
 * expone consulta de saldo/historial; no hay endpoint para crear retiros.
 */
@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JWTAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly earningsService: WalletEarningsService,
    private readonly withdrawalsService: WalletWithdrawalsService,
  ) {}

  @Get('balance')
  @ApiOperation({ summary: 'Saldo disponible desglosado (propio / coautor)' })
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.earningsService.getBalance(user.id);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Historial paginado de ganancias acreditadas' })
  getEarnings(@CurrentUser() user: JwtPayload, @Query() pagination: EarningsPaginationDto) {
    return this.earningsService.getEarningsHistory(user.id, pagination);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Historial paginado de solicitudes de retiro' })
  getWithdrawals(@CurrentUser() user: JwtPayload, @Query() pagination: WithdrawalPaginationDto) {
    return this.withdrawalsService.findForUser(user.id, pagination);
  }

  @Get('withdrawals/:id')
  @ApiOperation({ summary: 'Detalle de una solicitud de retiro propia' })
  getWithdrawal(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.withdrawalsService.findOneForUser(id, user.id);
  }
}
