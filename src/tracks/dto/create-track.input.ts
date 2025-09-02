import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ExternalIdInput } from './external-id.input';

@InputType()
export class CreateTrackInput {
  @Field()
  @IsString({ message: 'El título debe ser un texto válido' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  title: string;

  @Field(() => ID)
  @IsUUID('4', { message: 'El genreId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El genreId es obligatorio' })
  genreId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'El subgénero debe ser un texto válido' })
  subGenre?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'La portada debe ser un texto válido (URL esperada)' })
  @IsUrl({}, { message: 'La portada debe ser una URL válida' })
  cover?: string;

  @Field()
  @IsString({ message: 'La URL debe ser un texto válido' })
  @IsUrl({}, { message: 'La URL de la canción debe ser válida' })
  @IsNotEmpty({ message: 'La URL es obligatoria' })
  url: string;

  @Field()
  @IsString({ message: 'El idioma debe ser un texto válido' })
  @IsNotEmpty({ message: 'El idioma es obligatorio' })
  language: string;

  @Field()
  @IsNotEmpty({ message: 'El año es obligatorio' })
  @IsNumber({}, { message: 'El año debe ser un número' })
  year: number

  @Field()
  @IsString({ message: 'La letra debe ser un texto válido' })
  @IsNotEmpty({ message: 'La letra es obligatoria' })
  lyric: string;

  @Field(() => [ExternalIdInput], { nullable: true })
  @IsOptional()
  @IsArray({ message: 'externalsIds debe ser un arreglo de strings' })
  externalsIds?: ExternalIdInput[];

  @Field(() => [ID])
  @IsArray({ message: 'authorsIds debe ser un arreglo de UUIDs' })
  @IsUUID('4', {
    each: true,
    message: 'Cada authorId debe ser un UUID v4 válido',
  })
  @IsNotEmpty({ message: 'authorsIds no puede estar vacío' })
  authorsIds: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'isAvailable debe ser un valor booleano' })
  isAvailable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'isGospel debe ser un valor booleano' })
  isGospel?: boolean;
}
