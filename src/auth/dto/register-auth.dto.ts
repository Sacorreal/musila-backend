import { IsEmail, IsOptional, IsString, MinLength } from "class-validator"
import { UserRole } from "src/users/entities/user-role.enum"



export class RegisterAuthDto {
    @IsString()
    name: string

    @IsString()
    lastName: string

    @IsEmail()
    email: string

    @IsString()
    @MinLength(6)
    password: string


    @IsString()
    @MinLength(6)
    repeatPassword: string

    @IsString()
    @IsOptional()
    countryCode?: string

    @IsOptional()
    phone?: string

    @IsString()
    @IsOptional()
    typeCitizenID?: string

    @IsOptional()
    citizenID?: string

    @IsString()
    @IsOptional()
    avatar?: string

    @IsOptional()
    @IsString()
    role?: UserRole
}