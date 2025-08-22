import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => ID)
  @IsUUID('4', { message: 'El id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  id: string;
}
