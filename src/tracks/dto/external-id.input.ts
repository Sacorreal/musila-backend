import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class ExternalIdInput {
    @ApiProperty({
        example: 'ISRC',
        description:
        `Tipo de identificador externo. Puede ser: 
        **ISRC**: Código internacional de grabación de sonido (ej: "USRC17607839").
        **IPI**: Código de identificación de un compositor, autor o editor musical (ej: "00012345678").`
    })
    @IsString({ message: 'El tipo debe ser un texto' })
    type: string;

    @ApiProperty({
        example: 'USRC17607839',
        description:
        `Valor del identificador externo correspondiente al tipo elegido.
        Ejemplo: un código ISRC válido o un código IPI válido.`
    })
    @IsString({ message: 'El valor debe ser un texto' })
    value: string;
}
