
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { LicenseType } from '../entities/license-type.enum';
import { ApiProperty } from '@nestjs/swagger';


export class CreateRequestedTrackInput {

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único (UUID v4) del usuario que solicita el track.'
  })
  @IsUUID('4', { message: 'El requesterId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El requesterId es obligatorio' })
  requesterId: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único (UUID v4) del track solicitado.'
  })
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @ApiProperty({
    example: LicenseType.LICENCIA_DE_PRIMER_USO,
    description: 'Tipo de licencia solicitada para el track. Debe ser un valor válido dentro del enum LicenseType (por ejemplo: EXCLUSIVE, NON_EXCLUSIVE).'
  })
  @IsEnum(LicenseType, {
    message:
      'El licenseType debe ser un valor válido dentro del enum LicenseType',
  })
  licenseType: LicenseType;
}
