import { PartialType } from '@nestjs/swagger';
import { CreateMoodInput } from './create-mood.input';

export class UpdateMoodInput extends PartialType(CreateMoodInput) {}
