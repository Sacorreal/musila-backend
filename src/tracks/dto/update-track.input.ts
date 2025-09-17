
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateTrackInput } from './create-track.input';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTrackInput extends PartialType(CreateTrackInput) {

  @IsUUID('4', { message: 'El id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  id: string;
}
