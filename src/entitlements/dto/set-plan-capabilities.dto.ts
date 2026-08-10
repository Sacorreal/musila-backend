import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetPlanCapabilitiesDto {
  @ApiProperty({ type: [String], description: 'Set completo de IDs de capabilities del plan' })
  @IsArray()
  @IsUUID('4', { each: true })
  capabilityIds: string[];
}
