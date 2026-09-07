import { ApiProperty } from '@nestjs/swagger';

/** Un campo evaluado dentro de una categoría del Health Score. */
export class HealthScoreFieldDto {
  @ApiProperty({ example: 'iswc' })
  key: string;

  @ApiProperty({ example: 'ISWC' })
  label: string;

  @ApiProperty({ example: false })
  completed: boolean;
}

/** Categoría simple del Health Score (Documental, Legal, Comercial). */
export class HealthScoreCategoryDto {
  @ApiProperty({ example: 66.67, description: 'Porcentaje de completitud de la categoría (0-100).' })
  score: number;

  @ApiProperty({ type: [HealthScoreFieldDto] })
  fields: HealthScoreFieldDto[];

  @ApiProperty({ example: ['ISWC'], description: 'Etiquetas de los campos faltantes.' })
  missingFields: string[];

  @ApiProperty({ example: null, required: false, description: 'Advertencia cuando la categoría no pudo evaluarse por falta de datos base (Flow 2, caso de error).' })
  warning?: string;
}

/** Subcomponente Split Autoral: proporción de coautores que ya firmaron. */
export class SplitAuthoralScoreDto {
  @ApiProperty({ example: 100 })
  score: number;

  @ApiProperty({ example: 2 })
  signedCount: number;

  @ApiProperty({ example: 2 })
  totalCoauthors: number;
}

/** Subcomponente Split Editorial: condicionado a que el autor tenga editora configurada. */
export class SplitEditorialScoreDto {
  @ApiProperty({ example: true, description: 'Si el autor tiene editora configurada (no aplica si es false).' })
  applicable: boolean;

  @ApiProperty({ example: 100, nullable: true, description: 'null cuando no aplica.' })
  score: number | null;

  @ApiProperty({ example: [] })
  missingFields: string[];
}

/** Categoría Estado de Propiedad Intelectual: promedio de sus 2 subcomponentes. */
export class HealthScoreIntellectualPropertyDto {
  @ApiProperty({ example: 100, description: 'Promedio de los subcomponentes aplicables (0-100).' })
  score: number;

  @ApiProperty({ type: SplitAuthoralScoreDto })
  splitAuthoral: SplitAuthoralScoreDto;

  @ApiProperty({ type: SplitEditorialScoreDto })
  splitEditorial: SplitEditorialScoreDto;
}

/** Health Score completo de una canción, desglosado por las 4 categorías del Editorial Command Center. */
export class TrackHealthScoreDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  trackId: string;

  @ApiProperty({ example: 'Amanecer' })
  title: string;

  @ApiProperty({ example: 78.5, description: 'Promedio de las 4 categorías (0-100).' })
  overallScore: number;

  @ApiProperty({ type: HealthScoreCategoryDto })
  documentary: HealthScoreCategoryDto;

  @ApiProperty({ type: HealthScoreCategoryDto })
  legal: HealthScoreCategoryDto;

  @ApiProperty({ type: HealthScoreIntellectualPropertyDto })
  intellectualProperty: HealthScoreIntellectualPropertyDto;

  @ApiProperty({ type: HealthScoreCategoryDto })
  commercial: HealthScoreCategoryDto;
}
