import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { OTP_CODE_LENGTH, OTP_EXPIRATION_MINUTES } from './otp.constants';
import { GeneratedOtp } from './otp.interface';

/**
 * Utilidad agnóstica de dominio para generar y validar códigos OTP.
 * No conoce entidades ni canales de envío (email/SMS): la persistencia
 * y el envío del código son responsabilidad del módulo que lo consume.
 */
@Injectable()
export class OtpService {
  generate(expirationMinutes: number = OTP_EXPIRATION_MINUTES): GeneratedOtp {
    return {
      code: this.generateCode(),
      expiresAt: this.addMinutes(new Date(), expirationMinutes),
    };
  }

  isExpired(expiresAt: Date): boolean {
    return Date.now() > expiresAt.getTime();
  }

  isValid(inputCode: string, expectedCode: string, expiresAt: Date): boolean {
    return !this.isExpired(expiresAt) && inputCode === expectedCode;
  }

  private generateCode(): string {
    const upperBound = 10 ** OTP_CODE_LENGTH;
    return randomInt(0, upperBound).toString().padStart(OTP_CODE_LENGTH, '0');
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
}
