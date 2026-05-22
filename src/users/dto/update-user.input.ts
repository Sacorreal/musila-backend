

import { CreateUserInput } from './create-user.input';
import { PartialType } from '@nestjs/swagger';


export class UpdateUserInput extends PartialType(CreateUserInput) {}
