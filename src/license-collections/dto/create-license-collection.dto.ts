import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateLicenseCollectionDto {
  @ApiProperty({ description: 'ID de la solicitud de licencia de primer uso', format: 'uuid' })
  @IsUUID()
  requestedTrackId: string;

  @ApiProperty({ description: 'Valor del anticipo en COP', example: 500000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Fecha pactada de pago (ISO 8601)', example: '2026-08-01T00:00:00.000Z' })
  @IsDateString()
  dueDate: string;
}
