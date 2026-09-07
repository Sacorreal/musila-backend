import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class UpdatePublishingDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  hasPublishingDeal: boolean;

  @ApiProperty({ required: false, description: 'UUID de un PublishingContract ya registrado por el usuario' })
  @ValidateIf((dto: UpdatePublishingDto) => dto.hasPublishingDeal)
  @IsUUID('4', { message: 'Selecciona el contrato editorial que cubre esta obra' })
  publishingContractId?: string;

  @ApiProperty({ required: false, example: 50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  publishingAdministeredPercentage?: number;
}
