import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum IntellectualPropertyType {
  COPYRIGHT_OFFICE = 'copyrightOffice',
  CMO = 'cmo',
}

export class IntellectualPropertyInput {
  @ApiProperty({
    example: 'cmo',
    description: 'Tipo de propiedad intelectual (copyrightOffice o cmo).',
    enum: IntellectualPropertyType,
  })
  @IsEnum(IntellectualPropertyType, { message: 'El tipo debe ser copyrightOffice o cmo' })
  @IsNotEmpty()
  type: IntellectualPropertyType;

  @ApiProperty({
    example: 'SAYCO',
    description: 'Código del país o acrónimo de la CMO.',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'intellectual-property/doc123.pdf',
    description: 'Llave de almacenamiento para el documento PDF.',
  })
  @IsString()
  @IsNotEmpty()
  documentKey: string;

  @ApiProperty({
    example: 'https://ejemplo.com/doc123.pdf',
    description: 'URL pública del documento PDF.',
  })
  @IsString()
  @IsNotEmpty()
  documentUrl: string;
}
