import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from '../shared/shared-module-jwt/shared-module.module';
import { GuestsModule } from 'src/guests/guests.module';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [UsersModule, SharedModule, GuestsModule, PaymentsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

