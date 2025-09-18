import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateIntellectualPropertyInput } from './create-intellectual-property.input';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateIntellectualPropertyInput extends PartialType(
  CreateIntellectualPropertyInput,
) {
  @IsUUID('4', { message: 'El id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  id: string;
}
