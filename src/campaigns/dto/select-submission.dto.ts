import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LicenseType } from 'src/requested-tracks/entities/license-type.enum';

/** El sello aprueba una postulación: elige el tipo de licencia y arranca el flujo de solicitud ya implementado. */
export class SelectSubmissionDto {
  @ApiProperty({ enum: LicenseType, example: LicenseType.LICENCIA_DE_PRIMER_USO })
  @IsEnum(LicenseType)
  licenseType: LicenseType;
}
