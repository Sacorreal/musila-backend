import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { MembershipType } from 'src/authorization/entities/membership-type.enum';

/**
 * Datos de la relación editora-autor capturados al confirmar un miembro del
 * roster (Flow 2). El nombre y el IPI de la editorial NUNCA viajan aquí: se
 * inyectan server-side desde `Organization.name`/`Organization.ipiNumber`
 * (no pueden ser alterados manualmente por el administrador).
 */
export class EditorialRelationshipInputDto {
  @ApiProperty({ example: 20, description: 'Porcentaje de participación editorial (0-100)' })
  @Min(0, { message: 'El porcentaje no puede ser negativo' })
  @Max(100, { message: 'El porcentaje no puede superar 100' })
  percentage: number;

  @ApiPropertyOptional({ example: 'publishing-contracts/uuid.pdf', description: 'Key en storage del PDF ya subido (opcional)' })
  @IsOptional()
  @IsString()
  contractKey?: string;

  @ApiPropertyOptional({ example: 'https://cdn.musila.com/...' })
  @IsOptional()
  @IsString()
  contractUrl?: string;
}

/** Aprobación de una solicitud de acceso: el administrador elige tipo y rol. */
export class ApproveAccessRequestDto {
  @ApiProperty({ enum: MembershipType, example: MembershipType.ORGANIZATION, description: 'Staff (ORGANIZATION) o roster (ROSTER)' })
  @IsNotEmpty()
  @IsEnum(MembershipType)
  membershipType: MembershipType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Rol a asignar dentro del tipo elegido' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    type: EditorialRelationshipInputDto,
    description:
      'Requerido cuando la organización es tipo PUBLISHER y membershipType es ROSTER: confirma el Publisher\'s Share del miembro incorporado.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditorialRelationshipInputDto)
  editorialRelationship?: EditorialRelationshipInputDto;
}
