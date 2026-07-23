import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsEmail, IsEmpty, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { UserPlanType } from "src/users/entities/user-plan-type.enum";
import { MusicRole } from "src/users/entities/music-role.enum";
import { SocialNetworksInput } from "src/users/dto/social-networks.input";
import { IsValidEmail } from "../decorators/is-valid-email.decorator";

/**
 * Tipos de plan que un usuario puede autoasignarse en el registro público.
 * ADMIN, EDITOR e INVITADO quedan excluidos deliberadamente: solo se asignan
 * vía el panel de administración o flujos internos, nunca desde este endpoint.
 */
export const PUBLIC_REGISTER_PLAN_TYPES = [
    UserPlanType.PLAN_AUTOR,
    UserPlanType.PLAN_DESCUBRIDOR,
    UserPlanType.PLAN_360,
] as const;

export class RegisterAuthDto {
    @ApiProperty({
        example: 'Sofía',
        description: 'Nombre del usuario.'
    })
    @IsString({ message: 'El nombre debe ser un texto válido' })
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(255, { message: 'El nombre no puede superar los 255 caracteres' })
    name!: string;

    @ApiProperty({
        example: 'Pérez',
        description: 'Apellido del usuario.'
    })
    @IsString({ message: 'El apellido debe ser un texto válido' })
    @IsNotEmpty({ message: 'El apellido es obligatorio' })
    @MaxLength(255, { message: 'El apellido no puede superar los 255 caracteres' })
    lastName: string;


    @ApiProperty({
        example: 'sofi.perez@gmail.com',
        description: 'Correo electrónico único del usuario.'
    })
    @IsEmail({}, { message: 'Debe proporcionar un email válido' })
    @IsNotEmpty({ message: 'El email es obligatorio' })
    @IsValidEmail({ message: 'No se permiten correos temporales'})
    email: string;

    @ApiProperty({
        example: 'miContraseña123',
        description: 'Contraseña de acceso (mínimo 6 caracteres).'
    })
    @IsString({ message: 'La contraseña debe ser un texto válido' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @IsNotEmpty({ message: 'La contraseña es obligatoria' })
    password: string;

    @ApiProperty({
        example: 'miContraseña123',
        description: 'Repetición de la contraseña para validar coincidencia'
    })
    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    repeatPassword: string

    @ApiProperty({
        example: '+54',
        description: 'Código de país del usuario (opcional).'
    })
    @IsNotEmpty({ message: 'El código de país es obligatorio' })
    @IsString({ message: 'El código de país debe ser un texto válido' })
    countryCode: string;

    @ApiProperty({
        example: 'Correa',
        description: 'Segundo apellido del usuario.'
    })
    @IsString({ message: 'El apellido debe ser un texto válido' })
    @IsOptional()
    @MaxLength(255, { message: 'El segundo apellido no puede superar los 255 caracteres' })
    secondLastName?: string;

    @ApiProperty({
        example: 'De jesus',
        description: 'Segundo nombre del usuario.'
    })
    @IsString({ message: 'El segundo nombre debe ser un texto válido' })
    @IsOptional()
    @MaxLength(255, { message: 'El segundo nombre no puede superar los 255 caracteres' })
    secondName?: string

    @ApiProperty({
        example: '2615551234',
        description: 'Número de teléfono del usuario'
    })
    @IsNotEmpty({ message: 'El teléfono es obligatorio' })
    @IsString()
    phone: string;

    @ApiPropertyOptional({
        example: 'DNI',
        description: 'Tipo de documento de identidad (opcional).'
    })
    @IsString({ message: 'El tipo de documento debe ser un texto válido' })
    @IsNotEmpty({ message: 'tipo de documento obligatorio' })
    typeCitizenID: string;

    @ApiPropertyOptional({
        example: '40123456',
        description: 'Número de documento de identidad del usuario (opcional).'
    })
    @IsNotEmpty({ message: 'El número de documento es obligatorio' })
    @IsString({ message: 'El número de documento debe ser un texto válido' })
    citizenID: string;

    @ApiProperty({
        example: UserPlanType.PLAN_AUTOR,
        enum: PUBLIC_REGISTER_PLAN_TYPES,
        description: 'Plan que el usuario elige al registrarse. Solo se permiten planes públicos (Plan Autor, Plan Descubridor, Plan 360); admin/editor/invitado se asignan por otras vías.'
    })
    @IsNotEmpty({ message: 'El plan es obligatorio' })
    @IsIn(PUBLIC_REGISTER_PLAN_TYPES, { message: 'El plan debe ser plan_autor, plan_descubridor o plan_360' })
    planType: (typeof PUBLIC_REGISTER_PLAN_TYPES)[number];

    @ApiProperty({
        example: MusicRole.COMPOSITOR,
        enum: MusicRole,
        description: 'Rol musical descriptivo del usuario (disciplina, no determina permisos).'
    })
    @IsNotEmpty({ message: 'El rol es obligatorio' })
    @IsEnum(MusicRole, { message: 'El rol debe ser un valor válido de MusicRole' })
    role: MusicRole;

    @ApiPropertyOptional({
        example: 'https://ejemplo.com/imagenes/avatar.jpg',
        description: 'URL de la imagen de perfil del usuario (opcional).'
    })
    @IsOptional()
    @IsUrl({}, { message: 'El avatar debe ser una URL válida' })
    avatar?: string;

    @ApiPropertyOptional({
        example: 'Desarrolladora full stack apasionada por la música.',
        description: 'Breve biografía o descripción personal del usuario (opcional).'
    })
    @IsOptional()
    @IsString({ message: 'La biografía debe ser un texto válido' })
    @MaxLength(1000, { message: 'La biografía no puede superar los 1000 caracteres' })
    biography?: string;

    @ApiPropertyOptional({
        type: SocialNetworksInput,
        description: 'Redes sociales asociadas al usuario (opcional). Solo se aceptan claves conocidas con valores URL válidos.'
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => SocialNetworksInput)
    socialNetworks?: SocialNetworksInput;

    @ApiPropertyOptional({
        description: 'Campo trampa anti-bot: debe llegar siempre vacío. No mostrar en la UI real.',
    })
    @IsOptional()
    @IsEmpty({ message: 'Solicitud inválida' })
    companyWebsite?: string;

    @ApiProperty({ description: 'Token resuelto por el widget de Cloudflare Turnstile en el frontend.' })
    @IsString({ message: 'El token de verificación es inválido' })
    @IsNotEmpty({ message: 'Debes completar la verificación anti-bot' })
    turnstileToken: string;

    @ApiPropertyOptional({ example: ['uuid1', 'uuid2'], description: 'IDs de géneros preferidos' })
    @IsArray()
    @IsOptional()
    @IsUUID('4', { each: true })
    @ArrayMaxSize(3, { message: 'El array de preferredGenres debe tener un máximo de 3 elementos' })
    preferredGenres?: string[]

    @ApiPropertyOptional({ description: 'Referencia externa del pago de Mercado Pago para activar plan Pro.' })
    @IsOptional()
    @IsString()
    externalReference?: string;

    @ApiPropertyOptional({ description: 'Código de referido de un afiliado (programa de afiliados).' })
    @IsOptional()
    @IsString()
    referralCode?: string;
}