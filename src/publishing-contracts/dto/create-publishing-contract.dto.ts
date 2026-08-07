import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePublishingContractDto {
  @ApiProperty({ example: 'Editorial Musical S.A.S' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la editorial es obligatorio' })
  publisherName: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' })
  startDate: string;

  @ApiProperty({ example: '2030-01-01', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' })
  endDate?: string;

  @ApiProperty({ example: 'publishing-contracts/uuid.pdf', description: 'Key en storage del PDF ya subido' })
  @IsString()
  @IsNotEmpty({ message: 'El documento del contrato es obligatorio' })
  documentKey: string;

  @ApiProperty({ example: 'https://cdn.musila.com/...' })
  @IsString()
  @IsNotEmpty({ message: 'La URL del documento es obligatoria' })
  documentUrl: string;
}
