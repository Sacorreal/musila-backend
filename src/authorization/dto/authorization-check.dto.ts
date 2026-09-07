import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AuthorizationCheckDto {
  @ApiProperty({ description: 'Usuario a evaluar' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Contexto de organización (vacío = personal/plataforma)' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ example: 'private_pitching.create' })
  @IsString()
  @IsNotEmpty()
  capability: string;
}
