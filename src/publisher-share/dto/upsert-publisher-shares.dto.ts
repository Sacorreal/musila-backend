import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Publisher's Share para un miembro concreto del roster. */
export class PublisherShareItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: true, description: "Activa la inyección del Publisher's Share en las canciones del autor." })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 20, description: 'Porcentaje 0–100' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage: number;
}

/** Actualización masiva del Publisher's Share del roster. */
export class UpsertPublisherSharesDto {
  @ApiProperty({ type: [PublisherShareItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => PublisherShareItemDto)
  items: PublisherShareItemDto[];
}
