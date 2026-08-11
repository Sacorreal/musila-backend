import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { OrganizationType } from '../entities/organization-type.enum';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Sony Music' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'sony-music', description: 'Identificador URL-safe único' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo admite minúsculas, números y guiones',
  })
  @MaxLength(100)
  slug: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.LABEL })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiPropertyOptional({ example: 'LABEL_PRO', description: 'Plan B2B a contratar al crear' })
  @IsOptional()
  @IsString()
  planKey?: string;

  @ApiProperty({
    example: 'admin@sonymusic.com',
    description:
      'Email del Organization Admin inicial. Si ya tiene cuenta se le asigna la membership; si no, recibe una invitación por email para registrarse.',
  })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({
    example: 'Ana Ruiz',
    description: 'Nombre del Organization Admin, para personalizar el correo de invitación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  adminName?: string;
}
