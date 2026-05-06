import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AddCollaboratorDto } from './add-collaborator.dto';

export class AddMultipleCollaboratorsDto {
  @ApiProperty({
    type: [AddCollaboratorDto],
    description: 'Lista de colaboradores a agregar',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCollaboratorDto)
  collaborators: AddCollaboratorDto[];
}
