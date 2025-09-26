import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator"
import { UserRole } from "src/users/entities/user-role.enum"



export class RegisterAuthDto {

    @ApiProperty({
        example: "Valentino",
        description: "Nombre del usuario."
    })
    @IsString()
    name: string

    @ApiProperty({
        example: "Perez",
        description: "Apellido del usuario."
    })
    @IsString()
    lastName: string

    @ApiProperty({
        example: 'valentino@example.com',
        description: "Correo electrónico del usuario. Debe ser único y válido."
    })
    @IsEmail()
    email: string

    @ApiProperty({
        example: "password123",
        description: "Contraseña del usuario. Debe tener al menos 6 caracteres."
    })
    @IsString()
    @MinLength(6)
    password: string

    @ApiProperty({
        example: "password123",
        description: "Repetición de la contraseña para validar coincidencia."
    })
    @IsString()
    @MinLength(6)
    repeatPassword: string

    @ApiProperty({
        example: "+54",
        description: "Código de país asociado al número de teléfono (opcional)."
    })
    @IsString()
    @IsOptional()
    countryCode?: string

    @ApiProperty({
        example: "2611234567",
        description: "Número de teléfono del usuario (opcional)."
    })
    @IsOptional()
    phone?: string

    @ApiProperty({
        example: "DNI",
        description: "Tipo de documento de identidad (ej: DNI, Pasaporte, etc.) (opcional)."
    })
    @IsString()
    @IsOptional()
    typeCitizenID?: string

    @ApiProperty({
        example: "12345678",
        description: "Número de documento de identidad del usuario (opcional)."
    })
    @IsOptional()
    citizenID?: string

    @ApiProperty({
        example: "https://example.com/avatar.jpg",
        description: "URL de la imagen de perfil del usuario (opcional)."
    })
    @IsString()
    @IsOptional()
    avatar?: string

    @ApiProperty({
        example: "USER",
        description: "Rol asignado al usuario dentro de la plataforma. Valores posibles: ADMIN, USER (opcional)."
    })
    @IsOptional()
    @IsString()
    role?: UserRole
}