import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Postulación del compositor: el track ya publicado que envía a la campaña. */
export class SubmitToCampaignDto {
  @ApiProperty({ description: 'UUID del track ya publicado a postular' })
  @IsUUID()
  trackId: string;
}
