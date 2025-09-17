import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestInput } from './create-guest.input';
import { IsUUID } from 'class-validator';

export class UpdateGuestInput extends PartialType(CreateGuestInput) {

  @IsUUID()
  id: string;
}
