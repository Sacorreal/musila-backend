import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { GuestsService } from 'src/guests/guests.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { PaymentsService } from 'src/payments/payments.service';
import { AffiliatesService } from 'src/affiliates/affiliates.service';
import { AuditLogService } from 'src/users/audit-log.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt'

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>
  let jwtService: jest.Mocked<JwtService>
  let guestsService: { findGuestByCitizenIDForAuth: jest.Mock }

  beforeEach(async () => {
    guestsService = { findGuestByCitizenIDForAuth: jest.fn() }

    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    }) as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService,
        {
          provide: UsersService,
          useValue: {
            findUserByEmailService: jest.fn(),
            findUserBycitizenIDService: jest.fn(),
            createUserService: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn()
          }
        },
        { provide: GuestsService, useValue: guestsService },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
        { provide: PaymentsService, useValue: { linkUserToPayment: jest.fn() } },
        { provide: AffiliatesService, useValue: { attributeReferral: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('fake-secret') } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService)
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>
  })

  describe('loginService', () => {
    it('Debe lanzar UnathorizedException si el usuario no existe', async () => {
      usersService.findUserBycitizenIDService.mockResolvedValue(null)
      guestsService.findGuestByCitizenIDForAuth.mockResolvedValue(null)

      await expect(
        authService.loginService({
          citizenID: '123456789',
          password: '123456'
        })
      ).rejects.toThrow(UnauthorizedException)
    })

    it('Debe lanzar UnatorizedException si la contraseña es incorrecta', async () => {

      usersService.findUserBycitizenIDService.mockResolvedValue({
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
      usersService.findUserBycitizenIDService.mockResolvedValue({
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
    it('Debe lanzar BadRequestException si el token de Turnstile es inválido', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false }),
      })

      await expect(
        authService.registerService({
          citizenID: '123456789',
          email: 'test@test.com',
          password: '123456',
          repeatPassword: '123456',
          name: 'test',
          turnstileToken: 'bad-token',
        } as any, '127.0.0.1')
      ).rejects.toThrow('No se pudo verificar que eres humano, intenta de nuevo')

      expect(usersService.findUserBycitizenIDService).not.toHaveBeenCalled()
    })

    it('Debe lanzar UnauthorizedException si el citizenID ya existe', async () => {
      usersService.findUserBycitizenIDService.mockResolvedValue({} as any)
      await expect(
        authService.registerService({
          citizenID: '123456789',
          email: 'test@test.com',
          password: '123456',
          repeatPassword: '123456',
          name: 'test'
        } as any, '127.0.0.1')
      ).rejects.toThrow(UnauthorizedException)
    })

    it('Debe lanzar ConflictException si el email ya existe', async () => {
      usersService.findUserBycitizenIDService.mockResolvedValue(null)
      usersService.findUserByEmailService.mockResolvedValue({} as any)
      await expect(
        authService.registerService({
          citizenID: '123456789',
          email: 'test@test.com',
          password: '123456',
          repeatPassword: '123456',
          name: 'test'
        } as any, '127.0.0.1')
      ).rejects.toThrow(ConflictException)
    })

    it('Debe crear un usuario, forzar isVerified:false y devolver un token', async () => {
      usersService.findUserBycitizenIDService.mockResolvedValue(null)
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
      } as any, '127.0.0.1')

      expect(usersService.createUserService).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: false }),
      )
      expect(result).toEqual({ token: 'fake-jwt-token' })
    })
  })
});
