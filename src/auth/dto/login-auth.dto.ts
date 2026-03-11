import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginAuthDto {

    @ApiProperty({
        example: "103299000",
        description: "Número de documento registrado del usuario. Debe ser válido para poder iniciar sesión."
    })
    @IsString()
    citizenID: string;

    @ApiProperty({
        example: "password123",
        description: "Contraseña del usuario asociada al correo electrónico. Debe coincidir con la registrada en el sistema."
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}
