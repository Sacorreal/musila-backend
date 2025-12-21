import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";


export class ForgotPasswordDto {

    @ApiProperty({
        example: 'example@example.com',
        description: 'Email del usuario a recuperar la password'
    })
    @IsNotEmpty({})
    @IsEmail(
        {},
        { message: 'Debe proporcionar un email válido' }
    )
    email: string;
}