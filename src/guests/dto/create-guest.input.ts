import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';


@InputType()
export class CreateGuestInput {
  @IsUUID()
  @Field(() => ID, { description: 'ID del usuario que invita' })
  invitedById: string
}
