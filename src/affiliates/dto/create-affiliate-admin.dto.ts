import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BankAccountInput } from './bank-account.input';
import { AffiliateTier } from '../entities/affiliate-tier.enum';
import { AffiliateStatus } from '../entities/affiliate-status.enum';

export class CreateAffiliateAdminDto {
  @ApiProperty({ example: 'Sofía' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({ example: 'sofi.perez@gmail.com' })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: 'miContraseña123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiPropertyOptional({ example: '3000000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '+57' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'Estudio de Grabación XYZ' })
  @IsOptional()
  @IsString()
  companyOrBrand?: string;

  @ApiPropertyOptional({ example: 'https://miweb.com' })
  @IsOptional()
  @IsUrl({}, { message: 'El sitio web debe ser una URL válida' })
  website?: string;

  @ApiPropertyOptional({
    example: 'Canal de YouTube sobre producción musical con 50k suscriptores',
  })
  @IsOptional()
  @IsString()
  audienceDescription?: string;

  @ApiPropertyOptional({
    example: { instagram: 'https://instagram.com/usuario', tiktok: 'https://tiktok.com/@usuario' },
  })
  @IsOptional()
  socialNetworks?: Record<string, string>;

  @ApiPropertyOptional({ example: '3000000000', description: 'Nequi/Daviplata u otro medio de pago.' })
  @IsOptional()
  @IsString()
  paymentPhone?: string;

  @ApiPropertyOptional({ type: BankAccountInput })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountInput)
  bankAccount?: BankAccountInput;

  @ApiPropertyOptional({ enum: AffiliateTier, default: AffiliateTier.STANDARD })
  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @ApiPropertyOptional({ enum: AffiliateStatus, default: AffiliateStatus.APPROVED })
  @IsOptional()
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;
}
