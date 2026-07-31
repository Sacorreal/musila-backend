import { PartialType } from '@nestjs/swagger';
import { CreateThemeInput } from './create-theme.input';

export class UpdateThemeInput extends PartialType(CreateThemeInput) {}
