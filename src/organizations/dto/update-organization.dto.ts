import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrganizationType } from '../entities/organization-type.enum';
import { IsIpiNumber } from 'src/shared/validators/is-ipi-number.validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Sony Music Latin' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ enum: OrganizationType })
  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '00000000199',
    description: 'IPI de la editorial (CISAC), 9 a 11 dígitos. Usado por el Editorial Command Center.',
  })
  @IsOptional()
  @IsString()
  @IsIpiNumber()
  ipiNumber?: string;
}
