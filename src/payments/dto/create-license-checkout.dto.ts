import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateLicenseCheckoutDto {
  @ApiProperty({ description: 'ID de la solicitud de licencia', format: 'uuid' })
  @IsUUID()
  requestedTrackId: string;

  @ApiProperty({ description: 'Email del cliente (opcional)', required: false })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}
