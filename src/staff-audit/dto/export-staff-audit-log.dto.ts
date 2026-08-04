import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { StaffAuditLogFilterDto } from './staff-audit-log-filter.dto';

export class ExportStaffAuditLogDto extends StaffAuditLogFilterDto {
  @ApiProperty({ enum: ['csv', 'pdf'], example: 'csv' })
  @IsIn(['csv', 'pdf'])
  format: 'csv' | 'pdf';
}
