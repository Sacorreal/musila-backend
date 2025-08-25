import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { LicenseType } from '../entities/license-type.enum';

@InputType()
export class CreateRequestedTrackInput {
  @Field(() => ID)
  @IsUUID('4', { message: 'El requesterId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El requesterId es obligatorio' })
  requesterId: string;

  @Field(() => ID)
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @Field(() => LicenseType)
  @IsEnum(LicenseType, {
    message:
      'El licenseType debe ser un valor válido dentro del enum LicenseType',
  })
  licenseType: LicenseType;
}
