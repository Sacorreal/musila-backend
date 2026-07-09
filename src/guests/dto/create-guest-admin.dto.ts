import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateGuestAdminDto {
  @ApiProperty({ example: 'Juan' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Pérez' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'juan.perez@email.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MiPassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'ID del usuario que invita a este invitado (UUID)' })
  @IsNotEmpty()
  @IsUUID()
  invitedById: string;

  @ApiPropertyOptional({ example: '+54' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: '2615551234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsOptional()
  @IsString()
  typeCitizenID?: string;

  @ApiPropertyOptional({ example: '40123456' })
  @IsOptional()
  @IsString()
  citizenID?: string;
}
