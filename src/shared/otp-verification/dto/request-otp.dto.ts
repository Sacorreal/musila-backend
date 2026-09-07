import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { OtpPurpose } from '../otp-purpose.enum';

export class RequestOtpDto {
  @ApiProperty({ enum: OtpPurpose, description: 'Acción de negocio que exige el código OTP' })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiProperty({ description: 'ID de la entidad sobre la que se ejecuta la acción (UUID)' })
  @IsUUID()
  entityId: string;
}
