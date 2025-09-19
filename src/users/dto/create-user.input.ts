
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
import { ApiProperty } from '@nestjs/swagger';


export class CreateUserInput {

  @ApiProperty({ example: '', description: '' })
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(255, { message: 'El nombre no puede superar los 255 caracteres' })
  name: string;

  @ApiProperty({ example: '', description: '' })
  @IsString({ message: 'El apellido debe ser un texto válido' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;


  @ApiProperty({ example: '', description: '' })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({ example: '', description: '' })
  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString({ message: 'El código de país debe ser un texto válido' })
  countryCode?: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido' })
  phone?: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser un texto válido' })
  typeCitizenID?: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un texto válido' })
  citizenID?: string;

  @ApiProperty({ example: '', description: '' })
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido de UserRole' })
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsUrl({}, { message: 'El avatar debe ser una URL válida' })
  avatar?: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsBoolean({ message: 'isVerified debe ser un valor booleano' })
  isVerified?: boolean;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto válido' })
  biography?: string;

  @ApiProperty({ example: '', description: '' })
  @IsOptional()
  socialNetworks?: Record<string, string>;
}