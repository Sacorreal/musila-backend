
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserInput } from './create-user.input';
import { PartialType } from '@nestjs/mapped-types';


export class UpdateUserInput extends PartialType(CreateUserInput) {

  @IsUUID('4', { message: 'El id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  id: string;
}
