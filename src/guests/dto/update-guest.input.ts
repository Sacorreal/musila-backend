import { PartialType } from '@nestjs/swagger';
import { CreateGuestInput } from './create-guest.input';


export class UpdateGuestInput extends PartialType(CreateGuestInput) {}
