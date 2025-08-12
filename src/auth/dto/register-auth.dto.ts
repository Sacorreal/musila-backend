import { IsEmail, IsOptional, IsString, MinLength } from "class-validator"



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
    phone?: number

    @IsString()
    @IsOptional()
    typeCitizenID?: string

    @IsOptional()
    citizenID?: number

    @IsString()
    @IsOptional()
    avatar?: string
}