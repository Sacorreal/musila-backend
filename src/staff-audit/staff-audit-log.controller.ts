import { Controller, Get, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { CurrentUser } from 'src/users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StaffPermissionGuard } from 'src/staff-authorization/guards/staff-permission.guard';
import { RequireStaffPermission } from 'src/staff-authorization/decorators/require-staff-permission.decorator';
import { StaffAuditLogService } from './staff-audit-log.service';
import { StaffAuditLogFilterDto } from './dto/staff-audit-log-filter.dto';
import { ExportStaffAuditLogDto } from './dto/export-staff-audit-log.dto';
import { AuditAction } from './decorators/audit-action.decorator';
import { StaffAuditInterceptor } from './interceptors/staff-audit.interceptor';
import { buildCsv } from './export/csv-builder.util';
import { mapStaffAuditLogToPdfInput } from './export/staff-audit-pdf.mapper';
import { PdfGeneratorService } from 'src/shared/pdf/services/pdf-generator.service';
import { buildPdfHttpHeaders } from 'src/shared/pdf/utils/pdf-http-headers.util';

@ApiTags('Staff · Auditoría')
@ApiBearerAuth('JWT-auth')
@AllowedPlans(...ADMIN_PLAN_TYPES)
@UseGuards(JWTAuthGuard, PlansGuard, StaffPermissionGuard)
@UseInterceptors(StaffAuditInterceptor)
@Controller('staff/audit-log')
export class StaffAuditLogController {
  constructor(
    private readonly staffAuditLogService: StaffAuditLogService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  @Get()
  @RequireStaffPermission('audit:view')
  @AuditAction('audit:query')
  @ApiOperation({ summary: 'Listar el registro de auditoría de staff, con filtros (Flow 5)' })
  findAll(@Query() filter: StaffAuditLogFilterDto) {
    return this.staffAuditLogService.findAll(filter);
  }

  @Get('export')
  @RequireStaffPermission('audit:export')
  @AuditAction('audit:export')
  @ApiOperation({ summary: 'Exportar el registro de auditoría de staff a CSV o PDF' })
  async export(
    @Query() query: ExportStaffAuditLogDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const { format, ...filter } = query;
    const rows = await this.staffAuditLogService.findAllForExport(filter);
    const filename = `auditoria-staff-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'csv') {
      const csv = buildCsv(
        [
          { key: 'createdAt', header: 'Fecha' },
          { key: 'actorName', header: 'Actor' },
          { key: 'actorRoleName', header: 'Rol' },
          { key: 'module', header: 'Módulo' },
          { key: 'action', header: 'Acción' },
          { key: 'outcome', header: 'Resultado' },
          { key: 'ipAddress', header: 'IP' },
        ],
        rows,
      );

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      });
      res.send(csv);
      return;
    }

    const pdfInput = mapStaffAuditLogToPdfInput(rows, user.name ?? user.email);
    const buffer = await this.pdfGeneratorService.generate(pdfInput);
    res.set(buildPdfHttpHeaders(`${filename}.pdf`, buffer));
    res.send(buffer);
  }
}
