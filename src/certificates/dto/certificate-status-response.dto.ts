import { ApiProperty } from '@nestjs/swagger';
import { CertificateStatus } from '../entities/certificate-status.enum';

export class CertificateStatusResponseDto {
  @ApiProperty({ enum: CertificateStatus })
  status: CertificateStatus;

  @ApiProperty({ nullable: true })
  registryNumber: string | null;

  @ApiProperty({ nullable: true })
  issuedAt: Date | null;

  @ApiProperty({ description: 'true si el PDF está generado y confirmado presente en storage' })
  downloadAvailable: boolean;
}
