import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

/**
 * Token de inyección para el JwtService exclusivo de afiliados.
 * Se instancia manualmente (no vía JwtModule.registerAsync global) para que
 * use un secreto distinto al del core y así ningún token sea intercambiable
 * entre el core y el módulo de afiliados.
 */
export const AFFILIATE_JWT_SERVICE = 'AFFILIATE_JWT_SERVICE';

export const affiliateJwtServiceProvider: Provider = {
  provide: AFFILIATE_JWT_SERVICE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new JwtService({
      secret: config.get<string>('AFFILIATE_JWT_SECRET'),
      signOptions: {
        expiresIn: config.get<string>('AFFILIATE_JWT_EXPIRATION') || '30d',
      },
    }),
};
