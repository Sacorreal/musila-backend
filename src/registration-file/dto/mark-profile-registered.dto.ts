import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MarkProfileRegisteredDto {
  @ApiProperty({ example: 'SAYCO-2026-000123', description: 'Número de registro oficial recibido de la entidad' })
  @IsString()
  @IsNotEmpty({ message: 'El número de registro oficial es obligatorio' })
  officialRegistryNumber: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
