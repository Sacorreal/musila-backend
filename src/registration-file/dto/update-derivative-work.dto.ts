import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { OriginalWorkOrigin } from '../entities/original-work-origin.enum';

export class UpdateDerivativeWorkDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isDerivative: boolean;

  @ApiProperty({ enum: OriginalWorkOrigin, required: false })
  @ValidateIf((dto: UpdateDerivativeWorkDto) => dto.isDerivative)
  @IsEnum(OriginalWorkOrigin, { message: 'Indica el origen de la obra preexistente' })
  originalWorkOrigin?: OriginalWorkOrigin;

  @ApiProperty({ required: false })
  @ValidateIf((dto: UpdateDerivativeWorkDto) => dto.isDerivative)
  @IsString({ message: 'El ISWC es obligatorio para obras derivadas' })
  iswc?: string;

  @ApiProperty({ required: false })
  @ValidateIf((dto: UpdateDerivativeWorkDto) => dto.isDerivative)
  @IsString({ message: 'El nombre de la obra preexistente es obligatorio' })
  preexistingWorkName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adaptationType?: string;
}
