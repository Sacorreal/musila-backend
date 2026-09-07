import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { BankAccountInput } from './bank-account.input';

export class UpdateAffiliateProfileDto {
  @ApiPropertyOptional({ example: 'Sofía' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '3000000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Estudio de Grabación XYZ' })
  @IsOptional()
  @IsString()
  companyOrBrand?: string;

  @ApiPropertyOptional({ example: 'https://miweb.com' })
  @IsOptional()
  @IsUrl({}, { message: 'El sitio web debe ser una URL válida' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audienceDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  socialNetworks?: Record<string, string>;

  @ApiPropertyOptional({ example: '3000000000' })
  @IsOptional()
  @IsString()
  paymentPhone?: string;

  @ApiPropertyOptional({ type: BankAccountInput })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountInput)
  bankAccount?: BankAccountInput;
}
