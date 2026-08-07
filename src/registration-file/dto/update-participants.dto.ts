import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { RegistrationFileParticipantInputDto } from './registration-file-participant-input.dto';

export class UpdateParticipantsDto {
  @ApiProperty({
    type: [RegistrationFileParticipantInputDto],
    description: 'Reemplaza la lista completa de participantes (máx. 10, formato SAYCO)',
  })
  @IsArray()
  @ArrayMaxSize(10, { message: 'Máximo 10 participantes (formato SAYCO)' })
  @ValidateNested({ each: true })
  @Type(() => RegistrationFileParticipantInputDto)
  participants: RegistrationFileParticipantInputDto[];
}
