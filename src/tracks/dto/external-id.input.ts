import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ExternalIdInput {

    @ApiProperty({ example: '', description: '' })
    @IsString({ message: 'El tipo debe ser un texto' })
    type: string;

    @ApiProperty({ example: '', description: '' })
    @IsString({ message: 'El valor debe ser un texto' })
    value: string;
}