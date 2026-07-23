import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, Length } from 'class-validator';
import { OtpPurpose } from '../otp-purpose.enum';
import { OTP_CODE_LENGTH } from '../../otp/otp.constants';

export class VerifyOtpDto {
  @ApiProperty({ enum: OtpPurpose, description: 'Acción de negocio que exige el código OTP' })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiProperty({ description: 'ID de la entidad sobre la que se ejecuta la acción (UUID)' })
  @IsUUID()
  entityId: string;

  @ApiProperty({ description: 'Código OTP recibido por el canal asignado' })
  @IsString()
  @Length(OTP_CODE_LENGTH, OTP_CODE_LENGTH)
  code: string;
}
