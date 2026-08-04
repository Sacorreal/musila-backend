import { PdfBodyContentType } from 'src/shared/pdf/enums/pdf-body-content-type.enum';
import { PdfGenerateInput } from 'src/shared/pdf/interfaces/pdf-generate-input.interface';
import { StaffAuditLog } from '../entities/staff-audit-log.entity';

export function mapStaffAuditLogToPdfInput(
  rows: StaffAuditLog[],
  requestedByName: string,
): PdfGenerateInput {
  return {
    documentTitle: 'Registro de auditoría de staff',
    metadata: {
      title: 'Registro de auditoría de staff',
      author: requestedByName,
      generatedAt: new Date(),
    },
    body: {
      type: PdfBodyContentType.TABLE,
      columns: [
        { key: 'createdAt', header: 'Fecha' },
        { key: 'actorName', header: 'Actor' },
        { key: 'actorRoleName', header: 'Rol' },
        { key: 'module', header: 'Módulo' },
        { key: 'action', header: 'Acción' },
        { key: 'outcome', header: 'Resultado' },
      ],
      rows: rows.map((row) => ({
        createdAt: row.createdAt.toISOString(),
        actorName: row.actorName,
        actorRoleName: row.actorRoleName ?? '—',
        module: row.module,
        action: row.action,
        outcome: row.outcome,
      })),
    },
  };
}
