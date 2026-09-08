import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { WebauthnConfig } from '../config/webauthn.config';
import { WebauthnService } from './webauthn.service';

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

describe('WebauthnService', () => {
  let service: WebauthnService;
  let config: WebauthnConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    config = {
      rpID: 'musila.co',
      rpName: 'Musila',
      allowedOrigins: ['https://musila.co'],
    } as unknown as WebauthnConfig;
    service = new WebauthnService(config);
  });

  it('generateRegistrationOptions delega en la librería con la config del RP', async () => {
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({ challenge: 'c1' });

    const result = await service.generateRegistrationOptions({
      userId: 'user-1',
      userName: 'user@musila.co',
      userDisplayName: 'Usuario',
    });

    expect(result).toEqual({ challenge: 'c1' });
    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpName: 'Musila', rpID: 'musila.co' }),
    );
  });

  it('verifyRegistration devuelve null si la verificación no es exitosa', async () => {
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({ verified: false });

    const result = await service.verifyRegistration({
      response: {} as never,
      expectedChallenge: 'c1',
    });

    expect(result).toBeNull();
  });

  it('verifyRegistration mapea el resultado verificado a VerifiedRegistration', async () => {
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'cred-1',
          publicKey: Buffer.from('public-key'),
          counter: 0,
          transports: ['internal'],
        },
        aaguid: 'aaguid-1',
        credentialDeviceType: 'singleDevice',
        credentialBackedUp: false,
      },
    });

    const result = await service.verifyRegistration({
      response: {} as never,
      expectedChallenge: 'c1',
    });

    expect(result).toEqual({
      credentialId: 'cred-1',
      publicKey: Buffer.from('public-key').toString('base64url'),
      signCount: 0,
      aaguid: 'aaguid-1',
      deviceType: 'singleDevice',
      backedUp: false,
      transports: ['internal'],
    });
  });

  it('generateAuthenticationOptions delega en la librería con el rpID configurado', async () => {
    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({ challenge: 'c2' });

    const result = await service.generateAuthenticationOptions({});

    expect(result).toEqual({ challenge: 'c2' });
    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpID: 'musila.co' }),
    );
  });

  it('verifyAuthentication delega en la librería pasando la credencial serializada', async () => {
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({ verified: true });

    const result = await service.verifyAuthentication({
      response: {} as never,
      expectedChallenge: 'c1',
      credential: {
        credentialId: 'cred-1',
        publicKey: Buffer.from('public-key').toString('base64url'),
        signCount: 3,
      },
    });

    expect(result).toEqual({ verified: true });
    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRPID: 'musila.co',
        credential: expect.objectContaining({ id: 'cred-1', counter: 3 }),
      }),
    );
  });
});
