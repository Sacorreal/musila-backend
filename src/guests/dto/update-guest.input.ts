import { PartialType } from '@nestjs/swagger';
import { RegisterGuestDto} from './register-guest.dto'


export class UpdateGuestInput extends PartialType(RegisterGuestDto) {}
