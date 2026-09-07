import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsIn } from 'class-validator';
import { REGISTRATION_PROFILE_KEYS, RegistrationProfileKey } from '../entities/registration-profile-key.type';

export class CreateRegistrationFileDto {
  @ApiProperty({
    example: ['SAYCO'],
    enum: REGISTRATION_PROFILE_KEYS,
    isArray: true,
    description: 'Perfiles de registro para los que se preparará este expediente',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un perfil de registro (SAYCO y/o DNDA)' })
  @ArrayUnique()
  @IsIn(REGISTRATION_PROFILE_KEYS, { each: true, message: 'Perfil de registro no soportado' })
  activeProfileKeys: RegistrationProfileKey[];
}
