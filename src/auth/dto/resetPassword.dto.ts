import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class ResetPasswordDto {

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Token para resetear la contraseña'
    })
    token: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty({
        example: 'NuevaPassword123!',
        description: 'Nueva contraseña del usuario'
    })
    newPassword: string

}