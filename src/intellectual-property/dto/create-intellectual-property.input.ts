import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { IntellectualPropertyType } from 'src/tracks/dto/intellectual-property.input';

export class CreateIntellectualPropertyInput {

  @ApiProperty({
    example: 'cmo',
    description: 'Tipo de propiedad intelectual (copyrightOffice, cmo o splitSheet).',
    enum: IntellectualPropertyType,
  })
  @IsEnum(IntellectualPropertyType, { message: 'El tipo debe ser copyrightOffice, cmo o splitSheet' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: IntellectualPropertyType;

  @ApiProperty({ example: 'SAYCO', description: 'Código del país o acrónimo de la CMO.' })
  @IsString({ message: 'La clave debe ser un texto válido' })
  @IsNotEmpty({ message: 'La clave es obligatoria' })
  key: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'UUID de la pista musical' })
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @ApiPropertyOptional({ example: 'intellectual-property/doc123.pdf', description: 'Llave de almacenamiento del documento PDF.' })
  @IsOptional()
  @IsString({ message: 'La llave del documento debe ser un texto válido' })
  documentKey?: string;

  @ApiProperty({ example: 'https://cdn.musila.com/docs/123.pdf', description: 'URL pública del documento probatorio' })
  @IsString({ message: 'La URL del documento debe ser un texto válido' })
  @IsUrl({}, { message: 'El documentUrl debe ser una URL válida' })
  @IsNotEmpty({ message: 'El documentUrl es obligatorio' })
  documentUrl: string;
}
