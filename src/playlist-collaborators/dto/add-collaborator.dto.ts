import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CollaboratorPermission } from '../entities/collaborator-permission.enum';

export class AddCollaboratorDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del invitado (guest) a agregar como colaborador',
  })
  @IsUUID()
  guestId: string;

  @ApiPropertyOptional({
    enum: CollaboratorPermission,
    default: CollaboratorPermission.READ,
    description: 'Nivel de permiso del colaborador (default: read)',
  })
  @IsOptional()
  @IsEnum(CollaboratorPermission)
  permission?: CollaboratorPermission;
}
