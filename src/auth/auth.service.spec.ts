import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { GuestsService } from 'src/guests/guests.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { PaymentsService } from 'src/payments/payments.service';
import { AffiliatesService } from 'src/affiliates/affiliates.service';
import { AuditLogService } from 'src/users/audit-log.service';
import { OrganizationInviteService } from 'src/organizations/organization-invite.service';
import { WorkspaceInviteService } from 'src/organizations/workspace-invite.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, GoneException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import bcrypt from 'bcrypt'

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>
  let jwtService: jest.Mocked<JwtService>
  let eventBus: { emit: jest.Mock }
  let guestsService: { findGuestByCitizenIDForAuth: jest.Mock }

  beforeEach(async () => {
    guestsService = { findGuestByCitizenIDForAuth: jest.fn() }
    eventBus = { emit: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService,
        {
          provide: UsersService,
          useValue: {
            findUserByEmailService: jest.fn(),
            findUserBycitizenIDService: jest.fn(),
            createUserService: jest.fn(),
            saveEmailVerificationToken: jest.fn(),
            findUserByEmailVerificationToken: jest.fn(),
            markEmailAsVerified: jest.fn(),
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn()
          }
        },
        { provide: GuestsService, useValue: guestsService },
        { provide: EventBusService, useValue: eventBus },
        { provide: PaymentsService, useValue: { linkUserToPayment: jest.fn() } },
        { provide: AffiliatesService, useValue: { attributeReferral: jest.fn() } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
        {
          provide: OrganizationInviteService,
          useValue: { validate: jest.fn(), consumeForUser: jest.fn() },
        },
        {
          provide: WorkspaceInviteService,
          useValue: { validatePublic: jest.fn(), consumeForNewUser: jest.fn() },
        },
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
    it('Debe lanzar BadRequestException si el formulario se envía demasiado rápido (trampa de tiempo anti-bot)', async () => {
      await expect(
        authService.registerService({
          citizenID: '123456789',
          email: 'test@test.com',
          password: '123456',
          repeatPassword: '123456',
          name: 'test',
          formStartedAt: Date.now(),
        } as any, '127.0.0.1')
      ).rejects.toThrow('Solicitud inválida')

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
      expect(usersService.saveEmailVerificationToken).toHaveBeenCalledWith(
        '1',
        expect.any(String),
        expect.any(Date),
      )
      expect(eventBus.emit).toHaveBeenCalledWith(
        'user.email.verification.requested',
        expect.objectContaining({ email: 'test@test.com', name: 'test' }),
      )
      expect(result).toEqual({ token: 'fake-jwt-token' })
    })
  })

  describe('verifyEmailService', () => {
    it('Debe lanzar BadRequestException si el token no existe', async () => {
      usersService.findUserByEmailVerificationToken.mockResolvedValue(null)

      await expect(
        authService.verifyEmailService({ token: 'no-existe' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('Debe lanzar GoneException si el token expiró', async () => {
      usersService.findUserByEmailVerificationToken.mockResolvedValue({
        id: '1',
        isVerified: false,
        emailVerificationTokenExpires: new Date(Date.now() - 1000),
      } as any)

      await expect(
        authService.verifyEmailService({ token: 'expirado' }),
      ).rejects.toThrow(GoneException)
      expect(usersService.markEmailAsVerified).not.toHaveBeenCalled()
    })

    it('Debe marcar el email como verificado con un token válido', async () => {
      usersService.findUserByEmailVerificationToken.mockResolvedValue({
        id: '1',
        isVerified: false,
        emailVerificationTokenExpires: new Date(Date.now() + 60_000),
      } as any)

      const result = await authService.verifyEmailService({ token: 'valido' })

      expect(usersService.markEmailAsVerified).toHaveBeenCalledWith('1')
      expect(result).toEqual({ message: 'Correo verificado correctamente' })
    })
  })

  describe('resendVerificationService', () => {
    it('No debe revelar si el email no existe', async () => {
      usersService.findUserByEmailService.mockResolvedValue(null)

      const result = await authService.resendVerificationService({ email: 'no-existe@test.com' })

      expect(usersService.saveEmailVerificationToken).not.toHaveBeenCalled()
      expect(result.message).toMatch(/Si el correo existe/)
    })

    it('No debe reenviar si el usuario ya está verificado', async () => {
      usersService.findUserByEmailService.mockResolvedValue({ id: '1', isVerified: true } as any)

      await authService.resendVerificationService({ email: 'verificado@test.com' })

      expect(usersService.saveEmailVerificationToken).not.toHaveBeenCalled()
    })

    it('Debe reenviar el token si el usuario existe y no está verificado', async () => {
      usersService.findUserByEmailService.mockResolvedValue({
        id: '1',
        email: 'pendiente@test.com',
        name: 'Pendiente',
        isVerified: false,
      } as any)

      await authService.resendVerificationService({ email: 'pendiente@test.com' })

      expect(usersService.saveEmailVerificationToken).toHaveBeenCalledWith(
        '1',
        expect.any(String),
        expect.any(Date),
      )
    })
  })
});
