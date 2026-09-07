import { OtpService } from './otp.service';
import { OTP_CODE_LENGTH } from './otp.constants';

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(() => {
    service = new OtpService();
  });

  describe('generate', () => {
    it('genera un código numérico de 4 dígitos', () => {
      const { code } = service.generate();

      expect(code).toHaveLength(OTP_CODE_LENGTH);
      expect(code).toMatch(/^\d{4}$/);
    });

    it('conserva ceros a la izquierda cuando el código generado es corto', () => {
      jest.spyOn(require('crypto'), 'randomInt').mockReturnValue(7);

      const { code } = service.generate();

      expect(code).toBe('0007');

      jest.restoreAllMocks();
    });

    it('calcula la expiración 15 minutos adelante por defecto', () => {
      const now = Date.now();

      const { expiresAt } = service.generate();

      const diffMinutes = (expiresAt.getTime() - now) / (60 * 1000);
      expect(diffMinutes).toBeCloseTo(15, 1);
    });

    it('permite personalizar los minutos de expiración', () => {
      const now = Date.now();

      const { expiresAt } = service.generate(5);

      const diffMinutes = (expiresAt.getTime() - now) / (60 * 1000);
      expect(diffMinutes).toBeCloseTo(5, 1);
    });
  });

  describe('isExpired', () => {
    it('retorna true cuando la fecha de expiración ya pasó', () => {
      const expiresAt = new Date(Date.now() - 1000);

      expect(service.isExpired(expiresAt)).toBe(true);
    });

    it('retorna false cuando la fecha de expiración aún no llega', () => {
      const expiresAt = new Date(Date.now() + 1000);

      expect(service.isExpired(expiresAt)).toBe(false);
    });
  });

  describe('isValid', () => {
    it('retorna true cuando el código coincide y no ha expirado', () => {
      const expiresAt = new Date(Date.now() + 1000);

      expect(service.isValid('1234', '1234', expiresAt)).toBe(true);
    });

    it('retorna false cuando el código no coincide', () => {
      const expiresAt = new Date(Date.now() + 1000);

      expect(service.isValid('0000', '1234', expiresAt)).toBe(false);
    });

    it('retorna false cuando el código coincide pero ya expiró', () => {
      const expiresAt = new Date(Date.now() - 1000);

      expect(service.isValid('1234', '1234', expiresAt)).toBe(false);
    });
  });
});
