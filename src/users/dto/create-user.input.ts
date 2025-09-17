
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


export class CreateUserInput {
  
  @IsString({ message: 'El nombre debe ser un texto válido' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(255, { message: 'El nombre no puede superar los 255 caracteres' })
  name: string;

  @IsString({ message: 'El apellido debe ser un texto válido' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  lastName: string;


  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto válido' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsOptional()
  @IsString({ message: 'El código de país debe ser un texto válido' })
  countryCode?: string;

  
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto válido' })
  phone?: string;

  
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser un texto válido' })
  typeCitizenID?: string;

  
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un texto válido' })
  citizenID?: string;


  @IsEnum(UserRole, { message: 'El rol debe ser un valor válido de UserRole' })
  @IsOptional()
  role?: UserRole;

  
  @IsOptional()
  @IsUrl({}, { message: 'El avatar debe ser una URL válida' })
  avatar?: string;

  
  @IsOptional()
  @IsBoolean({ message: 'isVerified debe ser un valor booleano' })
  isVerified?: boolean;

  
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto válido' })
  biography?: string;

  @IsOptional()
  socialNetworks?: Record<string, string>;
}