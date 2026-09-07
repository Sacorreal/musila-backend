import { ApiProperty } from '@nestjs/swagger';

/** Resumen de una canción del catálogo dentro del listado del Editorial Command Center. */
export class CatalogHealthScoreItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  trackId: string;

  @ApiProperty({ example: 'Amanecer' })
  title: string;

  @ApiProperty({ example: 78.5 })
  overallScore: number;

  @ApiProperty({ example: 100 })
  documentaryScore: number;

  @ApiProperty({ example: 33.33 })
  legalScore: number;

  @ApiProperty({ example: 100 })
  intellectualPropertyScore: number;

  @ApiProperty({ example: 80 })
  commercialScore: number;
}

/** Promedio de cada categoría a través de todo el catálogo evaluado. */
export class HealthScoreCategoryAveragesDto {
  @ApiProperty({ example: 82.1 })
  documentary: number;

  @ApiProperty({ example: 55.4 })
  legal: number;

  @ApiProperty({ example: 91.2 })
  intellectualProperty: number;

  @ApiProperty({ example: 74.8 })
  commercial: number;
}

/** Health Score consolidado del catálogo (Feature 1 / Flow 1). */
export class CatalogHealthScoreDto {
  @ApiProperty({ example: 75.9, description: 'Promedio ponderado del catálogo (0-100).' })
  globalScore: number;

  @ApiProperty({ example: 128 })
  totalTracks: number;

  @ApiProperty({ type: HealthScoreCategoryAveragesDto })
  categoryAverages: HealthScoreCategoryAveragesDto;

  @ApiProperty({ type: [CatalogHealthScoreItemDto] })
  tracks: CatalogHealthScoreItemDto[];
}
