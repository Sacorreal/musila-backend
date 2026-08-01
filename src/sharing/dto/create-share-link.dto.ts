import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateShareLinkDto {
  @ApiPropertyOptional({
    description: 'Días hasta que expire el enlace. Si se omite, el enlace no expira.',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
