import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { LegalIdentificationType } from '../legal-identification-type.enum';

@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  }

  defaultMessage(): string {
    return 'La fecha de expedición no puede ser futura';
  }
}

const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;

export class UpsertLegalIdentityDto {
  @ApiProperty({ example: 'Sofía' })
  @IsString()
  @Matches(NAME_PATTERN, { message: 'El primer nombre solo puede contener letras y espacios' })
  @MinLength(2, { message: 'El primer nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  primerNombre: string;

  @ApiProperty({ example: 'Valentina' })
  @IsString()
  @Matches(NAME_PATTERN, { message: 'El segundo nombre solo puede contener letras y espacios' })
  @MinLength(2, { message: 'El segundo nombre debe tener al menos 2 caracteres' })
  @MaxLength(100)
  segundoNombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @Matches(NAME_PATTERN, { message: 'El primer apellido solo puede contener letras y espacios' })
  @MinLength(2, { message: 'El primer apellido debe tener al menos 2 caracteres' })
  @MaxLength(100)
  primerApellido: string;

  @ApiProperty({ example: 'Gómez' })
  @IsString()
  @Matches(NAME_PATTERN, { message: 'El segundo apellido solo puede contener letras y espacios' })
  @MinLength(2, { message: 'El segundo apellido debe tener al menos 2 caracteres' })
  @MaxLength(100)
  segundoApellido: string;

  @ApiProperty({ enum: LegalIdentificationType, example: LegalIdentificationType.CC })
  @IsEnum(LegalIdentificationType, { message: 'Tipo de identificación inválido' })
  tipoIdentificacion: LegalIdentificationType;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{5,15}$/, {
    message: 'El número de identificación debe tener entre 5 y 15 caracteres alfanuméricos',
  })
  numeroIdentificacion: string;

  @ApiProperty({ example: '2015-06-20' })
  @IsDateString({}, { message: 'La fecha de expedición debe ser una fecha válida (AAAA-MM-DD)' })
  @Validate(IsNotFutureDateConstraint)
  fechaExpedicion: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @Matches(/^[0-9]{7,10}$/, { message: 'El número de celular debe tener entre 7 y 10 dígitos' })
  numeroCelular: string;

  @ApiProperty({ example: '+57' })
  @IsString()
  @IsNotEmpty({ message: 'El indicativo de país es obligatorio' })
  @Matches(/^\+[0-9]{1,4}$/, { message: 'El indicativo de país debe tener el formato +NN' })
  indicativoPais: string;
}
