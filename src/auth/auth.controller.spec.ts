import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{
        provide: AuthService,
        useValue: {
          loginService: jest.fn(),
          registerService: jest.fn()
        }
      }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService)
  });

  describe('loginController', () => {
    it('Debe llamar a login service con el DTO recibido', async () => {
      const dto: LoginAuthDto = { email: 'test@test.com', password: '123456' };
        (authService.loginService as jest.Mock).mockResolvedValue('mock-token');

      const result = await authController.loginController(dto)

      expect(authService.loginService).toHaveBeenCalledWith(dto)
      expect(result).toBe('mock-token')


    })
  })

  describe('registerController', () => {
    it('Si la contraseña no coincide debe lanzar un BadRequestException', async () => {
      const dto: RegisterAuthDto = { name: 'test', lastname: 'test', email: 'test@test.com', password: '123456', repeatPassword: '1234567' };
        (authService.registerService as jest.Mock).mockResolvedValue('user-created');
      await expect(authController.registerController(dto))
        .rejects.toThrow('Las contraseñas no coinciden')

      expect(authService.registerService).not.toHaveBeenCalled()

    })

    it('Debe llamar a registerService y retornar el resultado si las contraseñas coinciden', async () => {
      const dto: RegisterAuthDto = { name: 'test', lastname: 'test', email: 'test@test.com', password: '123456', repeatPassword: '123456' }
        (authService.registerService as jest.Mock).mockResolvedValue('user-created')

      const result = await authController.registerController(dto)
      expect(authService.registerService).toHaveBeenCalledWith(dto)
      expect(result).toBe('user-created')
    })
  })
});
