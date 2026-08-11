import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

/**
 * Respuesta de la ceremonia de registro producida por el navegador
 * (`startRegistration`). Es un objeto opaco: el backend nunca confía en datos
 * de negocio del cliente, solo reenvía esta respuesta a la librería (§8, §10).
 */
export class VerifyPasskeyRegistrationDto {
  @ApiProperty({ description: 'RegistrationResponseJSON de @simplewebauthn/browser' })
  @IsObject()
  response: RegistrationResponseJSON;

  @ApiPropertyOptional({ description: 'Nombre legible para identificar la Passkey' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

/** Respuesta de la ceremonia de autenticación (`startAuthentication`). */
export class VerifyPasskeyAuthenticationDto {
  @ApiProperty({ description: 'AuthenticationResponseJSON de @simplewebauthn/browser' })
  @IsObject()
  response: AuthenticationResponseJSON;
}

export class RenamePasskeyDto {
  @ApiProperty({ example: 'MacBook de trabajo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
