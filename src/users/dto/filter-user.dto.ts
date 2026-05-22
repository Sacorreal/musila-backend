import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { UserRole } from '../entities/user-role.enum';

export class FilterUserDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, apellido o email (búsqueda parcial)', example: 'juan' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por rol', enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filtrar por estado de verificación', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isVerified?: boolean;
}
