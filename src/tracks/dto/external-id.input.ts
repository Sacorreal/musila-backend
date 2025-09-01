import { Field, InputType } from "@nestjs/graphql";
import { IsString } from "class-validator";



@InputType()
export class ExternalIdInput {
    @Field()
    @IsString({ message: 'El tipo debe ser un texto' })
    type: string;

    @Field()
    @IsString({ message: 'El valor debe ser un texto' })
    value: string;
}