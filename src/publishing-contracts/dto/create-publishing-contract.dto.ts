import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { IsIpiNumber } from 'src/shared/validators/is-ipi-number.validator';

export class CreatePublishingContractDto {
  @ApiProperty({ example: 'Editorial Musical S.A.S' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la editorial es obligatorio' })
  publisherName: string;

  @ApiProperty({ example: '00000000199', description: 'IPI (CISAC) de la editorial' })
  @IsString()
  @IsIpiNumber()
  ipiNumber: string;

  @ApiProperty({ example: 20, description: 'Porcentaje de participación de la editorial (0-100)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El porcentaje debe ser un número válido' })
  @Min(0, { message: 'El porcentaje no puede ser negativo' })
  @Max(100, { message: 'El porcentaje no puede superar 100' })
  percentage: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ example: '2030-01-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' })
  endDate?: string;

  @ApiProperty({
    example: 'publishing-contracts/uuid.pdf',
    required: false,
    description: 'Key en storage del PDF ya subido (contrato opcional)',
  })
  @IsOptional()
  @IsString()
  documentKey?: string;

  @ApiProperty({ example: 'https://cdn.musila.com/...', required: false })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
