import { ApiProperty } from '@nestjs/swagger';

/** Canción del roster comprador con más reproducciones en el período. */
export class BuyerRankedTrackDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  trackId: string;

  @ApiProperty({ example: 'Amanecer' })
  title: string;

  @ApiProperty({ example: 340, description: 'Reproducciones en el período.' })
  plays: number;
}

/** Miembro del roster (artista gestionado) con más reproducciones en el período. */
export class BuyerActiveMemberDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ example: 'Laura Restrepo' })
  name: string;

  @ApiProperty({ example: 512, description: 'Reproducciones acumuladas en el período.' })
  plays: number;
}

/** Punto de la serie mensual de licencias aprobadas. */
export class BuyerMonthlyLicenseTrendPointDto {
  @ApiProperty({ example: '2026-09', description: "Mes en formato 'YYYY-MM'." })
  month: string;

  @ApiProperty({ example: 6, description: 'Licencias aprobadas en el mes.' })
  count: number;
}

/** Métricas clave del roster comprador (artistas gestionados que licencian canciones). */
export class BuyerOverviewDto {
  @ApiProperty({ example: 1240, description: 'Reproducciones totales del roster este mes (eventos, no canciones distintas).' })
  playsThisMonth: number;

  @ApiProperty({ example: 980, description: 'Reproducciones totales del roster el mes anterior.' })
  playsLastMonth: number;

  @ApiProperty({ example: 27, description: '% de cambio de reproducciones vs. el mes anterior.' })
  playsChangePct: number;

  @ApiProperty({ example: 8, description: 'Licencias aprobadas este mes.' })
  licensesThisMonth: number;

  @ApiProperty({ example: 5, description: 'Licencias aprobadas el mes anterior.' })
  licensesLastMonth: number;

  @ApiProperty({ example: 60, description: '% de cambio de licencias vs. el mes anterior.' })
  licensesChangePct: number;

  @ApiProperty({ example: 16800000, description: 'Valor total licenciado este mes (COP).' })
  licensedValueThisMonth: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ example: 12, description: 'Miembros ACTIVE del roster comprador.' })
  activeRosterMembers: number;

  @ApiProperty({
    type: BuyerRankedTrackDto,
    nullable: true,
    description: 'Canción más escuchada por el roster este mes, si hay reproducciones.',
  })
  topTrackThisMonth: BuyerRankedTrackDto | null;

  @ApiProperty({
    type: BuyerActiveMemberDto,
    nullable: true,
    description: 'Miembro del roster con más reproducciones este mes, si hay reproducciones.',
  })
  mostActiveRosterMember: BuyerActiveMemberDto | null;

  @ApiProperty({
    type: [BuyerMonthlyLicenseTrendPointDto],
    description: 'Licencias aprobadas por mes en los últimos 6 meses, orden cronológico ascendente.',
  })
  monthlyLicenseTrend: BuyerMonthlyLicenseTrendPointDto[];
}

/** Fila de una canción licenciada por un miembro del roster comprador. */
export class BuyerLicensedTrackRowDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  requestId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  trackId: string;

  @ApiProperty({ example: 'Amanecer' })
  trackTitle: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Autor/dueño del track.' })
  ownerName: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  requesterId: string;

  @ApiProperty({ example: 'Laura Restrepo', description: 'Miembro del roster comprador que solicitó la licencia.' })
  requesterName: string;

  @ApiProperty({ example: 'sincronizacion' })
  licenseType: string;

  @ApiProperty({ example: 2100000, nullable: true })
  licensePrice: number | null;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ example: 'approved' })
  licensePaymentStatus: string;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    description:
      "Proxy de fecha de aprobación: RequestedTrack.updatedAt en la última transición de estado a APROBADA. " +
      'Limitación conocida: no hay tabla de historial de transiciones de estado en este dominio, así que si la ' +
      'solicitud vuelve a cambiar de estado después de aprobarse, este valor refleja la última transición.',
  })
  approvedAt: string;

  @ApiProperty({ example: '2026-08-20T00:00:00.000Z' })
  createdAt: string;
}

/** Respuesta paginada por mes de las canciones licenciadas por el roster comprador. */
export class BuyerDashboardLicensesResponseDto {
  @ApiProperty({ example: '2026-09', description: "Mes efectivamente resuelto, formato 'YYYY-MM'." })
  month: string;

  @ApiProperty({ example: 8 })
  total: number;

  @ApiProperty({ type: [BuyerLicensedTrackRowDto] })
  data: BuyerLicensedTrackRowDto[];
}
