import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Activa o desactiva la comisión por anticipo de licencia de la publisher. */
export class UpdateCommissionPolicyDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  commissionEnabled: boolean;
}
