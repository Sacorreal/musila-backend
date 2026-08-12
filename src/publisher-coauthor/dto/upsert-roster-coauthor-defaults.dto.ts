import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';

/** Configuración de coautoría por defecto para un miembro concreto del roster. */
export class RosterCoauthorDefaultItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: true, description: 'Activa la inyección de la publisher como coautora.' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: CoauthorRole, example: CoauthorRole.COMPOSITOR })
  @IsEnum(CoauthorRole, { message: 'El rol no es válido' })
  role: CoauthorRole;

  @ApiProperty({ example: 20, description: 'Porcentaje 0–100' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage: number;
}

/** Actualización masiva de la coautoría por defecto del roster. */
export class UpsertRosterCoauthorDefaultsDto {
  @ApiProperty({ type: [RosterCoauthorDefaultItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RosterCoauthorDefaultItemDto)
  items: RosterCoauthorDefaultItemDto[];
}
