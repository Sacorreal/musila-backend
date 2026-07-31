import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateThemeInput {
  @ApiProperty({
    example: 'Navidad',
    description: 'Nombre del tema/uso.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Slug del tema (auto-generado si se omite)', example: 'navidad' })
  @IsString()
  @IsOptional()
  slug?: string;
}
