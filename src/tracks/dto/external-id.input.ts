import { IsString } from "class-validator";

export class ExternalIdInput {

    @IsString({ message: 'El tipo debe ser un texto' })
    type: string;

    @IsString({ message: 'El valor debe ser un texto' })
    value: string;
}