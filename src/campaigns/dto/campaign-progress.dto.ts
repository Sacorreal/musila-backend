import { ApiProperty } from '@nestjs/swagger';

/** Progreso de cumplimiento de una campaña (§Progreso de la campaña). */
export class CampaignProgressDto {
  @ApiProperty() pendingCount: number;
  @ApiProperty() selectedCount: number;
  @ApiProperty() licensedCount: number;
  @ApiProperty() discardedCount: number;
  @ApiProperty({ description: 'Porcentaje de cumplimiento: seleccionadas / requeridas, tope 100' })
  completionPercentage: number;

  static build(params: {
    requiredSongsCount: number;
    pendingCount: number;
    selectedCount: number;
    licensedCount: number;
    discardedCount: number;
  }): CampaignProgressDto {
    const dto = new CampaignProgressDto();
    dto.pendingCount = params.pendingCount;
    dto.selectedCount = params.selectedCount;
    dto.licensedCount = params.licensedCount;
    dto.discardedCount = params.discardedCount;
    dto.completionPercentage = params.requiredSongsCount
      ? Math.min(100, Math.round((params.selectedCount / params.requiredSongsCount) * 100))
      : 0;
    return dto;
  }
}
