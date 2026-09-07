import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { UserPlanType } from '../entities/user-plan-type.enum';

export class FilterUserDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, apellido o email (búsqueda parcial)', example: 'juan' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de plan', enum: UserPlanType })
  @IsEnum(UserPlanType)
  @IsOptional()
  planType?: UserPlanType;

  @ApiPropertyOptional({ description: 'Filtrar por estado de verificación', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVerified?: boolean;
}
