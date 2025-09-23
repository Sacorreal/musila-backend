import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginAuthDto {

    @ApiProperty({
        example: "user@example.com",
        description: "Correo electrónico registrado del usuario. Debe ser válido para poder iniciar sesión."
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: "password123",
        description: "Contraseña del usuario asociada al correo electrónico. Debe coincidir con la registrada en el sistema."
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
