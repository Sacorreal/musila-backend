import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from '../shared/shared-module-jwt/shared-module.module';
import { GuestsModule } from 'src/guests/guests.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { AffiliatesModule } from 'src/affiliates/affiliates.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';

import { UserPasskey } from './entities/user-passkey.entity';
import { RecoveryCode } from './entities/recovery-code.entity';
import { UserTotpFactor } from './entities/user-totp-factor.entity';
import { WebauthnChallenge } from './entities/webauthn-challenge.entity';
import { StepUpGrant } from './entities/step-up-grant.entity';

import { WebauthnConfig } from './config/webauthn.config';
import { SecretCipherService } from './crypto/secret-cipher.service';
import { WebauthnService } from './services/webauthn.service';
import { ChallengeStoreService } from './services/challenge-store.service';
import { PasskeyService } from './services/passkey.service';
import { TotpService } from './services/totp.service';
import { RecoveryCodeService } from './services/recovery-code.service';
import { MfaService } from './services/mfa.service';
import { StepUpAuthService } from './services/step-up-auth.service';
import { StepUpGuard } from './guards/step-up.guard';

import { PasskeyController } from './passkey.controller';
import { MfaController } from './mfa.controller';
import { RecoveryCodeController } from './recovery-code.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserPasskey,
      RecoveryCode,
      UserTotpFactor,
      WebauthnChallenge,
      StepUpGrant,
    ]),
    UsersModule,
    SharedModule,
    GuestsModule,
    PaymentsModule,
    AffiliatesModule,
    OrganizationsModule,
  ],
  controllers: [
    AuthController,
    PasskeyController,
    MfaController,
    RecoveryCodeController,
  ],
  providers: [
    AuthService,
    WebauthnConfig,
    SecretCipherService,
    WebauthnService,
    ChallengeStoreService,
    PasskeyService,
    TotpService,
    RecoveryCodeService,
    MfaService,
    StepUpAuthService,
    StepUpGuard,
  ],
  exports: [PasskeyService, MfaService, StepUpAuthService, StepUpGuard],
})
export class AuthModule {}
