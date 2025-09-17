import { IsUUID } from 'class-validator';

export class CreateGuestInput {
  @IsUUID()
  invitedById: string
}
