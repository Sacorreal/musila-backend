
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { LicenseType } from '../entities/license-type.enum';
import { ApiProperty } from '@nestjs/swagger';


export class CreateRequestedTrackInput {

  @ApiProperty({ example: '', description: '' })
  @IsUUID('4', { message: 'El requesterId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El requesterId es obligatorio' })
  requesterId: string;

  @ApiProperty({ example: '', description: '' })
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @ApiProperty({ example: '', description: '' })
  @IsEnum(LicenseType, {
    message:
      'El licenseType debe ser un valor válido dentro del enum LicenseType',
  })
  licenseType: LicenseType;
}
