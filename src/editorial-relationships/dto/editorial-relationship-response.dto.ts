import { ApiProperty } from '@nestjs/swagger';

export type EditorialRelationshipSource = 'SELF_DECLARED' | 'PUBLISHER_CONFIRMED';

/**
 * `activa_sin_confirmar`: el Publisher's Share está habilitado (bulk-edit en
 * `/settings/publisher-share`) pero nunca pasó por la confirmación de Flow 2
 * — no es exactamente "pendiente" (ya está activo) ni "confirmada".
 */
export type EditorialRelationshipStatus = 'declarada' | 'confirmada' | 'rechazada' | 'activa_sin_confirmar';

/** Ítem del historial unificado de relaciones editora-autor (Flow 3). */
export class EditorialRelationshipDto {
  @ApiProperty({ example: 'SELF_DECLARED' })
  source: EditorialRelationshipSource;

  @ApiProperty({ example: 'confirmada' })
  status: EditorialRelationshipStatus;

  @ApiProperty({ example: 'Editorial Musical S.A.S' })
  editoraName: string;

  @ApiProperty({ example: '00000000199', nullable: true })
  editoraIpiNumber: string | null;

  @ApiProperty({ example: 20, nullable: true })
  percentage: number | null;

  @ApiProperty({ example: 'https://cdn.musila.com/...', nullable: true })
  documentUrl: string | null;

  @ApiProperty({ example: '2026-08-23T10:00:00Z', nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ example: '2026-08-20T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: 'Laura Restrepo', nullable: true, description: 'Nombre del autor, visto desde el lado editora.' })
  counterpartyName: string | null;
}
