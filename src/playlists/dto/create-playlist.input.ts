import { Field, ID, InputType } from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

@InputType()
export class CreatePlaylistInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'El título de la playlist es obligatorio' })
  title: string;

  @Field(() => ID)
  @IsUUID('4', { message: 'El ownerId debe ser un UUID válido' })
  @IsNotEmpty()
  ownerId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString({ message: 'La portada debe ser una URL en formato string' })
  cover?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray({ message: 'Los invitados deben enviarse como un arreglo de IDs' })
  @IsUUID('4', { each: true, message: 'Cada guestId debe ser un UUID válido' })
  guestsIds?: string[];

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray({ message: 'Las canciones deben enviarse como un arreglo de IDs' })
  @IsUUID('4', { each: true, message: 'Cada trackId debe ser un UUID válido' })
  tracksIds?: string[];
}

@InputType()
export class UpdatePlaylistInput {
  @Field(() => ID)
  @IsUUID('4', { message: 'El id debe ser un UUID válido' })
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  cover?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  guestsIds?: string[];

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tracksIds?: string[];
}
