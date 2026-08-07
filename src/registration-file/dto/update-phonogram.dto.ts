import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { RecordingType } from '../entities/recording-type.enum';

export class UpdatePhonogramDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasRecording: boolean;

  @ApiProperty({ enum: RecordingType, required: false })
  @ValidateIf((dto: UpdatePhonogramDto) => dto.hasRecording)
  @IsEnum(RecordingType, { message: 'Selecciona el tipo de grabación' })
  recordingType?: RecordingType;

  @ApiProperty({ required: false })
  @ValidateIf((dto: UpdatePhonogramDto) => dto.hasRecording)
  @IsString({ message: 'El ISRC es obligatorio cuando la obra está grabada' })
  isrc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phonogramProducer?: string;

  @ApiProperty({ required: false })
  @ValidateIf((dto: UpdatePhonogramDto) => dto.hasRecording)
  @IsString({ message: 'El titular del fonograma es obligatorio cuando la obra está grabada' })
  phonogramOwner?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recordingDate?: string;
}
