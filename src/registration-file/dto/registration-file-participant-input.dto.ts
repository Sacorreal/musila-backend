import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { RegistrationFileParticipantRole } from '../entities/registration-file-participant-role.enum';

export class RegistrationFileParticipantInputDto {
  @ApiProperty({ required: false, description: 'UUID de un SplitAuthor existente, si se autocompletó desde el split' })
  @IsOptional()
  @IsUUID('4')
  splitAuthorId?: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  fullName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ required: false, example: 'SAYCO' })
  @IsOptional()
  @IsString()
  managementSociety?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ipiCode?: string;

  @ApiProperty({ required: false, description: 'Carné SAYCO' })
  @IsOptional()
  @IsString()
  saycoCode?: string;

  @ApiProperty({ required: false, description: 'Campo "IP Name" si pertenece a otra sociedad' })
  @IsOptional()
  @IsString()
  saycoIpName?: string;

  @ApiProperty({ enum: RegistrationFileParticipantRole })
  @IsEnum(RegistrationFileParticipantRole, { message: 'El rol no es válido' })
  role: RegistrationFileParticipantRole;

  @ApiProperty({ example: 50, description: '% de participación autoral (PER)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  authorialPercentage: number;

  @ApiProperty({ example: 50, description: '% de participación mecánica (MEC)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  mechanicalPercentage: number;
}
