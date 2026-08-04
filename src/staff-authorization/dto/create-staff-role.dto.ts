import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateStaffRoleDto {
  @ApiProperty({ example: 'Editor de contenido' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Gestiona blog, tracks y géneros musicales' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [String],
    description: 'IDs de los permisos a asignar (mínimo 1)',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debes seleccionar al menos un permiso' })
  @ArrayUnique()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
