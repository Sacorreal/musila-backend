import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNumber, IsUUID, Max, Min, ValidateNested } from 'class-validator';

/** Porcentaje de comisión para un miembro concreto del roster. */
export class RosterCommissionItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 10, description: 'Porcentaje 0–100' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage: number;
}

/** Actualización masiva de los porcentajes de comisión del roster. */
export class UpsertRosterCommissionsDto {
  @ApiProperty({ type: [RosterCommissionItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RosterCommissionItemDto)
  items: RosterCommissionItemDto[];
}
