import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { WalletWithdrawalStatus } from '../entities/wallet-withdrawal-status.enum';

export class WithdrawalPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WalletWithdrawalStatus })
  @IsOptional()
  @IsEnum(WalletWithdrawalStatus)
  status?: WalletWithdrawalStatus;

  @ApiPropertyOptional({ description: 'Filtrar por usuario (solo admin)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
