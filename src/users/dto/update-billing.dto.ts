import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateBillingDto {
  @ApiPropertyOptional({ description: 'Razón social o nombre para facturación' })
  @IsOptional() @IsString() @MaxLength(200) fiscalName?: string;

  @ApiPropertyOptional({ description: 'NIT / RUT / RFC del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d{7,12}(-\d)?$/, { message: 'Formato de NIT/identificación fiscal inválido' })
  taxId?: string;

  @ApiPropertyOptional({ description: 'Dirección fiscal completa' })
  @IsOptional() @IsString() @MaxLength(300) fiscalAddress?: string;
}
