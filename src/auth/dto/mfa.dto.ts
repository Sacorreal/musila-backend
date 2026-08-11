import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

export class ConfirmTotpDto {
  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos de la app TOTP' })
  @IsString()
  @Length(6, 8)
  token: string;
}

/**
 * Verificación de un step-up (§15). Según `method`, se envía la aserción de
 * Passkey (`response`) o el código TOTP (`token`). El `scope` identifica la
 * operación sensible que se pretende autorizar.
 */
export class StepUpVerifyDto {
  @ApiProperty({ example: 'account.change_password' })
  @IsString()
  @MaxLength(120)
  scope: string;

  @ApiProperty({ enum: ['PASSKEY', 'TOTP'], example: 'PASSKEY' })
  @IsIn(['PASSKEY', 'TOTP'])
  method: 'PASSKEY' | 'TOTP';

  @ApiPropertyOptional({ description: 'AuthenticationResponseJSON (si method=PASSKEY)' })
  @IsOptional()
  @IsObject()
  response?: AuthenticationResponseJSON;

  @ApiPropertyOptional({ example: '123456', description: 'Código TOTP (si method=TOTP)' })
  @IsOptional()
  @IsString()
  @Length(6, 8)
  token?: string;
}

/** Solicitud de challenge para step-up con Passkey. */
export class StepUpChallengeDto {
  @ApiProperty({ example: 'account.change_password' })
  @IsString()
  @MaxLength(120)
  scope: string;
}
