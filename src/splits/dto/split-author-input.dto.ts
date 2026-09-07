import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { CoauthorRole } from '../entities/coauthor-role.enum';

export class SplitAuthorInputDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID del coautor (usuario Musila)' })
  @IsUUID('4', { message: 'El userId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El userId es obligatorio' })
  userId: string;

  @ApiProperty({ example: 50, description: 'Porcentaje de autoría asignado (0.01 a 100)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El porcentaje debe ser un número con máximo 2 decimales' })
  @Min(0.01, { message: 'El porcentaje debe ser mayor a 0' })
  @Max(100, { message: 'El porcentaje no puede superar 100' })
  percentage: number;

  @ApiProperty({ enum: CoauthorRole, example: CoauthorRole.COMPOSITOR })
  @IsEnum(CoauthorRole, { message: 'El rol no es válido' })
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  role: CoauthorRole;
}
