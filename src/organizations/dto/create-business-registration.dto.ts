import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { IsValidEmail } from 'src/auth/decorators/is-valid-email.decorator';
import {
  BusinessDocumentType,
  isValidDocumentTypeForCountry,
} from '../constants/business-document-catalog';
import { OrganizationType } from '../entities/organization-type.enum';

/** `documentType` debe pertenecer al catálogo permitido para `legalCountry`. */
function IsValidBusinessDocumentType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidBusinessDocumentType',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: BusinessDocumentType, args: ValidationArguments) {
          const legalCountry = (args.object as CreateBusinessRegistrationDto).legalCountry;
          return typeof value === 'string' && isValidDocumentTypeForCountry(legalCountry, value);
        },
        defaultMessage() {
          return 'El tipo de documento no es válido para el país de constitución seleccionado';
        },
      },
    });
  };
}

/**
 * `createBusinessForm` (§Registro Legal B2B, paso 1): registro público de una
 * empresa. Crea la cuenta del futuro Organization Admin (email+contraseña) y
 * la `Organization` en estado `EN_TRAMITE`.
 */
export class CreateBusinessRegistrationDto {
  @ApiProperty({ example: 'contacto@sonymusic.com' })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsValidEmail({ message: 'No se permiten correos temporales' })
  email: string;

  @ApiProperty({ example: 'MiPassword123!', description: 'Contraseña de acceso (mínimo 6 caracteres)' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiProperty({ example: 'Sony Music Colombia S.A.S.' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre legal de la empresa es obligatorio' })
  @MaxLength(150)
  legalName: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.LABEL })
  @IsEnum(OrganizationType, { message: 'El tipo de organización no es válido' })
  organizationType: OrganizationType;

  @ApiProperty({ example: 'CO', description: 'País de constitución (ISO 3166-1 alpha-2)' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'El país debe ser un código ISO de 2 letras (ej. CO)' })
  legalCountry: string;

  @ApiProperty({ enum: BusinessDocumentType, example: BusinessDocumentType.NIT })
  @IsEnum(BusinessDocumentType, { message: 'El tipo de documento no es válido' })
  @IsValidBusinessDocumentType()
  documentType: BusinessDocumentType;

  @ApiProperty({ example: '901091582-2', description: 'Número de documento, incluyendo dígito de verificación' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @MaxLength(50)
  documentNumber: string;

  @ApiProperty({ example: '+57' })
  @IsString()
  @Matches(/^\+[0-9]{1,4}$/, { message: 'El indicativo de país debe tener el formato +XX' })
  phoneCountryCode: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({ example: 'LABEL_B2B_STARTER', description: 'Clave del plan comercial elegido' })
  @IsString()
  @IsNotEmpty({ message: 'El plan es obligatorio' })
  planKey: string;
}
