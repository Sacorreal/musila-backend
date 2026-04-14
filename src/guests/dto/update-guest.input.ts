import { PartialType } from '@nestjs/swagger';
import { RegisterFromInviteDto} from './register-guest.dto'


export class UpdateGuestInput extends PartialType(RegisterFromInviteDto) {}
