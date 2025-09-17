
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { LicenseType } from '../entities/license-type.enum';


export class CreateRequestedTrackInput {
  @IsUUID('4', { message: 'El requesterId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El requesterId es obligatorio' })
  requesterId: string;

  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @IsEnum(LicenseType, {
    message:
      'El licenseType debe ser un valor válido dentro del enum LicenseType',
  })
  licenseType: LicenseType;
}
