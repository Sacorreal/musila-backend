import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAiUsageDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  usedAi: boolean;

  @ApiProperty({ required: false, description: 'Opcional incluso si usedAi es true (así lo indica el formulario SAYCO)' })
  @IsOptional()
  @IsString()
  toolUsed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  participationLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;
}
