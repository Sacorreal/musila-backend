import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateLicenseInstallmentCheckoutDto {
  @ApiProperty({ description: 'ID de la cuota de anticipo a pagar (LicenseCollection)', format: 'uuid' })
  @IsUUID()
  collectionId: string;
}
