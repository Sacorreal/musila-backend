import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateCommissionedWorkDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isCommissioned: boolean;

  @ApiProperty({ required: false })
  @ValidateIf((dto: UpdateCommissionedWorkDto) => dto.isCommissioned)
  @IsString({ message: 'La compañía contratante es obligatoria para obras por encargo' })
  contractingCompany?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;
}
