import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { WalletEarningRole } from '../entities/wallet-earning-role.enum';

export class EarningsPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WalletEarningRole })
  @IsOptional()
  @IsEnum(WalletEarningRole)
  role?: WalletEarningRole;
}
