import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService

  let mockAuthService: {
    loginService: jest.Mock,
    registerService: jest.Mock
  };

  beforeEach(async () => {

    mockAuthService = {
      loginService: jest.fn(),
      registerService: jest.fn()
    }


    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{
        provide: AuthService,
        useValue: mockAuthService
      }],
    }).compile();

    authController = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  });

  describe('loginController', () => {
    it('Debe llamar a loginService con el dto recibido', async () => {
      const dto: LoginAuthDto = { email: 'test@test.com', password: '123456' };
      (authService.loginService as jest.Mock).mockResolvedValue('mock-token');

      const result = await authController.loginController(dto)

      expect(mockAuthService.loginService).toHaveBeenCalledWith(dto)
      expect(result).toBe('mock-token')

    })
  })

  describe('RegisterController', () => {

    it('Si la contraseña no coincide debe lanzar un BadRequestException', async () => {

      const dto: RegisterAuthDto = { name: 'test', lastName: 'test', email: 'test@test.com', password: '123456', repeatPassword: '1234567' };
      (authService.registerService as jest.Mock).mockResolvedValue('user-created');

      await expect(authController.registerController(dto))
        .rejects.toThrow('Las contraseñas no coinciden')
      expect(mockAuthService.registerService).not.toHaveBeenCalled()
    })

    it('Debe llamar a registerService y retornar el resultado si las contraseñas coinciden', async () => {

      const dto: RegisterAuthDto = { name: 'test', lastName: 'test', email: 'test@test.com', password: '123456', repeatPassword: '123456' }
      mockAuthService.registerService.mockResolvedValue('user-created')

      const result = await authController.registerController(dto)

      expect(mockAuthService.registerService).toHaveBeenCalledWith(dto)
      expect(result).toBe('user-created')

    })
  })

});
