import { PartialType } from '@nestjs/mapped-types';
import { CreateGuestInput } from './create-guest.input';


export class UpdateGuestInput extends PartialType(CreateGuestInput) {}
