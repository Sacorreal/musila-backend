
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user-role.enum';


export class CreateUserInput {

  @ApiProperty({
    example: 'Sofía',
    description: 'Nombre del usuario.'
  })
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(255, { message: 'El nombre no puede superar los 255 caracteres' })
  name: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario.'
  })
  @IsString({ message: 'El apellido debe ser un texto válido' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;

  @ApiProperty({
    example: 'Correa',
    description: 'Segundo apellido del usuario.'
  })
  @IsString({ message: 'El apellido debe ser un texto válido' })
  @IsOptional()
  secondLastName?: string;

  @ApiProperty({
    example: 'De jesus',
    description: 'Segundo nombre del usuario.'
  })
  @IsString({ message: 'El segundo nombre debe ser un texto válido' })
  @IsOptional()
  secondName?: string


  @ApiProperty({
    example: 'sofi.perez@mail.com',
    description: 'Correo electrónico único del usuario.'
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({
    example: 'miContraseña123',
    description: 'Contraseña de acceso (mínimo 6 caracteres).'
  })
  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiPropertyOptional({
    example: '+54',
    description: 'Código de país del usuario (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'El código de país debe ser un texto válido' })
  countryCode?: string;

  @ApiPropertyOptional({
    example: '2615551234',
    description: 'Número de teléfono del usuario (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'DNI',
    description: 'Tipo de documento de identidad (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser un texto válido' })
  typeCitizenID?: string;

  @ApiPropertyOptional({
    example: '40123456',
    description: 'Número de documento de identidad del usuario (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un texto válido' })
  citizenID?: string;

  @ApiPropertyOptional({
    example: UserRole.ADMIN,
    enum: UserRole,
    description: 'Rol asignado al usuario dentro del sistema (opcional). Valores posibles definidos en el enum UserRole.'
  })
  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido de UserRole' })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    example: 'https://ejemplo.com/imagenes/avatar.jpg',
    description: 'URL de la imagen de perfil del usuario (opcional).'
  })
  @IsOptional()
  @IsUrl({}, { message: 'El avatar debe ser una URL válida' })
  avatar?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si la cuenta del usuario está verificada (opcional).'
  })
  @IsOptional()
  @IsBoolean({ message: 'isVerified debe ser un valor booleano' })
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'Desarrolladora full stack apasionada por la música.',
    description: 'Breve biografía o descripción personal del usuario (opcional).'
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto válido' })
  biography?: string;

  @ApiPropertyOptional({
    example: { instagram: 'https://urlderedsocial.com', twitter: 'https://urlderedsocial2.com' },
    description: 'Redes sociales asociadas al usuario como un objeto clave-valor (opcional).'
  })
  @IsOptional()
  socialNetworks?: Record<string, string>;

  @ApiPropertyOptional({ example: ['uuid1', 'uuid2'], description: 'IDs de géneros preferidos' })
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  preferredGenres?: string[]
}