import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

@InputType()
export class CreateIntellectualPropertyInput {
  @Field()
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @Field(() => ID)
  @IsUUID('4', { message: 'El trackId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El trackId es obligatorio' })
  trackId: string;

  @Field()
  @IsString({ message: 'La URL del documento debe ser un texto válido' })
  @IsUrl({}, { message: 'El documentUrl debe ser una URL válida' })
  @IsNotEmpty({ message: 'El documentUrl es obligatorio' })
  documentUrl: string;
}
