import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCollectiveManagementSocietyDto } from './create-collective-management-society.dto';
import { CollectiveManagementSocietyStatus } from '../entities/collective-management-society-status.enum';

export class UpdateCollectiveManagementSocietyDto extends PartialType(CreateCollectiveManagementSocietyDto) {
  @ApiPropertyOptional({ enum: CollectiveManagementSocietyStatus })
  @IsOptional()
  @IsEnum(CollectiveManagementSocietyStatus)
  status?: CollectiveManagementSocietyStatus;
}
