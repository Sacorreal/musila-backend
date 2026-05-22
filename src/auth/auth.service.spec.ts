import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt'

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>
  let jwtService: jest.Mocked<JwtService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService,
        {
          provide: UsersService,
          useValue: {
            findUserByEmailService: jest.fn(),
            createUserService: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn()
          }
        }
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService)
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>
  })

  describe('loginService', () => {
    it('Debe lanzar UnathorizedException si el usuario no existe', async () => {
      usersService.findUserByEmailService.mockResolvedValue(null)

      await expect(
        authService.loginService({
          citizenID: '123456789',
          password: '123456'
        })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('Debe lanzar UnatorizedException si la contraseña es incorrecta', async () => {
       
      usersService.findUserByEmailService.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword'
      } as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false) as any)

      await expect(
        authService.loginService({ citizenID: "123456789", password: "wrong" })
      ).rejects.toThrow(UnauthorizedException)
    })

    it("Debe devolver un token si las credenciales son correctas", async () => {
      usersService.findUserByEmailService.mockResolvedValue({
        id: "1",
        email: "test@test.com",
        password: "hashedPassword"
      } as any)
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true) as any)
      jwtService.signAsync.mockResolvedValue('fake-jwt-token')

      const result = await authService.loginService({ citizenID: '123456789', password: '123456' })

      expect(result).toEqual({ token: 'fake-jwt-token' })
    })
  })

  describe('registerService', () => {
    it('Debe lanzar UnauthorizedException si el usuario ya existe', async () => {
      usersService.findUserByEmailService.mockResolvedValue({} as any)
      await expect(
        authService.registerService({
          citizenID: '123456789',
          email: 'test@test.com',
          password: '123456',
          repeatPassword: '123456',
          name: 'test'
        } as any)
      ).rejects.toThrow(UnauthorizedException)
    })

    it('Debe crear un usuario y devolverlo sin password', async () => {
      usersService.findUserByEmailService.mockResolvedValue(null)
      usersService.createUserService.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: 'hashedPassword',
        name: 'test'
      } as any)

      jwtService.signAsync.mockResolvedValue('fake-jwt-token')

      const result = await authService.registerService({
        citizenID: '123456789',
        email: 'test@test.com',
        password: '123456',
        repeatPassword: '123456',
        name: 'test'
      } as any)
      expect(result).toEqual({ token: 'fake-jwt-token' })
    })
  })
});