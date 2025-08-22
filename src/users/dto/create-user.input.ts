import { Field, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user-role.enum';

@InputType()
export class CreateUserInput {
  @Field()
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(255, { message: 'El nombre no puede superar los 255 caracteres' })
  name: string;

  @Field()
  @IsString({ message: 'El apellido debe ser un texto válido' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @Field()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @Field()
  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'El código de país debe ser un texto válido' })
  countryCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido' })
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser un texto válido' })
  typeCitizenID?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un texto válido' })
  citizenID?: string;

  @Field(() => UserRole)
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido de UserRole' })
  role: UserRole;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'El avatar debe ser una URL válida' })
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'isVerified debe ser un valor booleano' })
  isVerified?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto válido' })
  biography?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  socialNetworks?: Record<string, string>;
}
