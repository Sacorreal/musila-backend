import { ApiProperty } from '@nestjs/swagger';

/** Métricas clave del catálogo del autor. */
export class AuthorOverviewDto {
  @ApiProperty({ example: 42, description: 'Canciones publicadas por el autor.' })
  songsPublished: number;

  @ApiProperty({ example: 38, description: 'Canciones activas (disponibles).' })
  songsActive: number;

  @ApiProperty({ example: 5400000, description: 'Ingresos generados (COP), acreditados en la wallet.' })
  incomeGenerated: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ example: 12850, description: 'Reproducciones totales del catálogo.' })
  totalPlays: number;

  @ApiProperty({ example: 26, description: 'Nº de playlists distintas que contienen alguna canción del autor.' })
  addedToPlaylists: number;

  @ApiProperty({ example: 73, description: 'Solicitudes de licencia recibidas.' })
  licenseRequestsReceived: number;

  @ApiProperty({ example: 28, description: 'Licencias vendidas (pago aprobado).' })
  licensesSold: number;
}

/** Rendimiento individual de una canción. */
export class SongDashboardDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  trackId: string;

  @ApiProperty({ example: 'Amanecer' })
  title: string;

  @ApiProperty({ example: 1240, description: 'Reproducciones totales de la canción.' })
  plays: number;

  @ApiProperty({ example: 310, description: 'Usuarios únicos que la reprodujeron.' })
  uniqueListeners: number;

  @ApiProperty({ example: 7, description: 'Nº de playlists que contienen la canción.' })
  playlists: number;
}

export class RankedItemDto {
  @ApiProperty({ example: 'Amanecer' })
  label: string;

  @ApiProperty({ example: 12 })
  count: number;
}

/** Indicadores de inteligencia de derechos. */
export class RightsIntelligenceDto {
  @ApiProperty({ example: 12, description: '% del catálogo que ha recibido al menos una solicitud.' })
  catalogUtilizationPct: number;

  @ApiProperty({ example: 38, description: '% de solicitudes aprobadas sobre las decididas.' })
  approvalRate: number;

  @ApiProperty({ example: 73, description: 'Solicitudes recibidas.' })
  requestsReceived: number;

  @ApiProperty({ type: [RankedItemDto], description: 'Canciones más pedidas.' })
  topRequestedTracks: RankedItemDto[];

  @ApiProperty({ type: [RankedItemDto], description: 'Géneros más solicitados.' })
  topGenres: RankedItemDto[];

  @ApiProperty({ type: [RankedItemDto], description: 'Ritmos (subgéneros) más solicitados.' })
  topRhythms: RankedItemDto[];
}

/** Indicadores de cumplimiento de derechos sobre el catálogo. */
export class RightsComplianceDto {
  @ApiProperty({ example: 67, description: 'Obras activas (disponibles / visibles).' })
  activeWorks: number;

  @ApiProperty({ example: 4, description: 'Obras inactivas (no disponibles / privadas).' })
  inactiveWorks: number;

  @ApiProperty({ example: 18, description: 'Obras con al menos una licencia vendida.' })
  licensedWorks: number;

  @ApiProperty({ example: 12, description: 'Obras sin split completado.' })
  worksWithoutSplit: number;

  @ApiProperty({ example: 18, description: 'Obras sin expediente de registro (SAYCO) listo.' })
  worksWithoutRegistration: number;

  @ApiProperty({ example: 5, description: 'Obras privadas (no disponibles). Derivado de isAvailable.' })
  privateWorks: number;

  @ApiProperty({ example: 67, description: 'Obras visibles (disponibles). Derivado de isAvailable.' })
  visibleWorks: number;

  @ApiProperty({ example: 8, description: 'Tiempo promedio de negociación en días (solicitudes cerradas).' })
  avgNegotiationDays: number;

  @ApiProperty({ example: 38, description: '% de cierre: aprobadas sobre recibidas.' })
  closeRate: number;

  @ApiProperty({ example: 2100000, description: 'Valor promedio de licencia vendida (COP).' })
  avgLicenseValue: number;

  @ApiProperty({ example: 'COP' })
  currency: string;
}

/** Próxima cuota de licencia pendiente por cobrar. */
export class NextPaymentDto {
  @ApiProperty({ example: 700000 })
  amount: number;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  dueDate: string;

  @ApiProperty({ example: 'Amanecer' })
  trackTitle: string;
}

/** Resumen financiero (wallet) del autor. */
export class AuthorFinancialDto {
  @ApiProperty({ example: 3200000, description: 'Saldo disponible para retiro.' })
  availableBalance: number;

  @ApiProperty({ example: 900000, description: 'Saldo pendiente (reservado en retiros en curso).' })
  pendingBalance: number;

  @ApiProperty({ example: 5400000, description: 'Ganancias totales acreditadas.' })
  totalEarned: number;

  @ApiProperty({ example: 1300000, description: 'Total retirado (pagado).' })
  totalWithdrawn: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiProperty({ type: NextPaymentDto, nullable: true, description: 'Próximo pago pendiente, si existe.' })
  nextPayment: NextPaymentDto | null;
}
