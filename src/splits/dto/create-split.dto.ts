import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { SplitAuthorInputDto } from './split-author-input.dto';

export class CreateSplitDto {
  @ApiProperty({ type: [SplitAuthorInputDto], description: 'Coautores del split (la suma de porcentajes debe ser 100)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes agregar al menos un coautor' })
  @ValidateNested({ each: true })
  @Type(() => SplitAuthorInputDto)
  authors: SplitAuthorInputDto[];
}
