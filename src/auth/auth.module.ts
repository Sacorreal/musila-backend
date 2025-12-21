import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { SharedModule } from 'src/shared-module-jwt/shared-module.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [UsersModule, SharedModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
