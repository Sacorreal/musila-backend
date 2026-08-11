import { Injectable } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { WebauthnConfig } from '../config/webauthn.config';

export interface AllowedCredential {
  credentialId: string;
  transports?: AuthenticatorTransportFuture[];
}

export interface VerifiedRegistration {
  credentialId: string;
  /** Clave pública COSE serializada en base64url (nunca la privada). */
  publicKey: string;
  signCount: number;
  aaguid: string;
  deviceType: string;
  backedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
}

/**
 * Única capa que conoce `@simplewebauthn/server` (Fabricación Pura /
 * Variaciones Protegidas): traduce entre las opciones/respuestas WebAuthn y
 * tipos de dominio de Musila. Aquí nunca se implementa criptografía manual
 * (§10): se delega toda la ceremonia en la librería mantenida.
 */
@Injectable()
export class WebauthnService {
  constructor(private readonly config: WebauthnConfig) {}

  async generateRegistrationOptions(params: {
    userId: string;
    userName: string;
    userDisplayName: string;
    excludeCredentials?: AllowedCredential[];
  }): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return generateRegistrationOptions({
      rpName: this.config.rpName,
      rpID: this.config.rpID,
      userName: params.userName,
      userDisplayName: params.userDisplayName,
      userID: new TextEncoder().encode(params.userId),
      attestationType: 'none',
      excludeCredentials: (params.excludeCredentials ?? []).map((c) => ({
        id: c.credentialId,
        transports: c.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyRegistration(params: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
  }): Promise<VerifiedRegistration | null> {
    const verification = await verifyRegistrationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: this.config.allowedOrigins,
      expectedRPID: this.config.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return null;
    }

    const { credential, aaguid, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    return {
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      signCount: credential.counter,
      aaguid,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports,
    };
  }

  async generateAuthenticationOptions(params: {
    allowCredentials?: AllowedCredential[];
  }): Promise<PublicKeyCredentialRequestOptionsJSON> {
    return generateAuthenticationOptions({
      rpID: this.config.rpID,
      userVerification: 'preferred',
      allowCredentials: params.allowCredentials?.map((c) => ({
        id: c.credentialId,
        transports: c.transports,
      })),
    });
  }

  async verifyAuthentication(params: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: {
      credentialId: string;
      publicKey: string;
      signCount: number;
      transports?: AuthenticatorTransportFuture[];
    };
  }): Promise<VerifiedAuthenticationResponse> {
    return verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: this.config.allowedOrigins,
      expectedRPID: this.config.rpID,
      requireUserVerification: false,
      credential: {
        id: params.credential.credentialId,
        publicKey: new Uint8Array(
          Buffer.from(params.credential.publicKey, 'base64url'),
        ),
        counter: params.credential.signCount,
        transports: params.credential.transports,
      },
    });
  }
}
