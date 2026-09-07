import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { CollectiveManagementSocietyOrganizationType } from '../entities/collective-management-society-organization-type.enum';

export class CreateCollectiveManagementSocietyDto {
  @ApiProperty({ example: 'Sociedad de Autores y Compositores de Colombia' })
  @IsString()
  @IsNotEmpty()
  officialName: string;

  @ApiProperty({ example: 'SAYCO' })
  @IsString()
  @IsNotEmpty()
  acronym: string;

  @ApiProperty({ example: 'Colombia' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'CO', description: 'ISO 3166-1 alpha-2' })
  @IsString()
  @Length(2, 2)
  isoCountryCode: string;

  @ApiPropertyOptional({ example: '84' })
  @IsOptional()
  @IsString()
  cisacSocietyId?: string;

  @ApiPropertyOptional({ enum: CollectiveManagementSocietyOrganizationType })
  @IsOptional()
  @IsEnum(CollectiveManagementSocietyOrganizationType)
  organizationType?: CollectiveManagementSocietyOrganizationType;
}
