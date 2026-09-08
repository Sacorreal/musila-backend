// UsersController -> StepUpGuard -> StepUpAuthService -> TotpService -> otplib
// (ESM). Mockeamos otplib para evitar cargar su cadena de módulos ESM en el
// test (mismo motivo que en step-up-auth.service.spec.ts).
jest.mock('otplib', () => ({
  generateSecret: () => 'SECRET',
  generateURI: () => 'otpauth://totp/x',
  generateSync: () => '123456',
  verifySync: () => ({ valid: true }),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersResolver', () => {
  let controller: UsersController;;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersController, UsersService],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
