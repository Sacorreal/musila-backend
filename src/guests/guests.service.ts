import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Plan } from 'src/entitlements/entities/plan.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';

import { RegisterGuestDto } from './dto/register-guest.dto'
import { UpdateGuestInput } from './dto/update-guest.input';
import { CreateGuestAdminDto } from './dto/create-guest-admin.dto';
import { GuestFilterDto } from './dto/guest-filter.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { InvitesService } from 'src/invites/invites.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthorizationService } from 'src/authorization/authorization.service';

import bcrypt from 'bcrypt';

const guestRelations: string[] = ['invited_by', 'playlistCollaborations', 'chats']

@Injectable()
export class GuestsService {
  private readonly logger = new Logger(GuestsService.name);

  constructor(
    @InjectRepository(Guest) private readonly guestsRepository: Repository<Guest>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Plan) private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Subscription) private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly invitesService: InvitesService,
    private readonly authorizationService: AuthorizationService,
  ) { }

  /** El plan GUEST otorga las capabilities del invitado (marketplace.search, license.request) sin cuotas. */
  private async assignGuestPlan(guestId: string): Promise<void> {
    const guestPlan = await this.plansRepository.findOne({ where: { key: 'GUEST' } });
    if (!guestPlan) {
      this.logger.warn('Plan GUEST no encontrado; ejecuta los seeds de autorización');
      return;
    }

    await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create({
        subjectType: SubjectType.USER,
        subjectId: guestId,
        planId: guestPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startAt: new Date(),
      }),
    );
  }

  private async assertCanManageGuest(guest: Guest, currentUser: JwtPayload): Promise<void> {
    if (guest.invited_by?.id === currentUser.id) return;

    const decision = await this.authorizationService.check(
      { userId: currentUser.id },
      { caps: ['platform.users.guests.manage'], operator: 'AND' },
    );
    if (!decision.allowed) {
      throw new ForbiddenException('No tienes permiso para gestionar este invitado');
    }
  }

  /** Creación directa por un administrador, sin flujo de invitación por token. */
  async createByAdmin(dto: CreateGuestAdminDto): Promise<Guest> {
    const existingEmail = await this.guestsRepository.findOne({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Ya existe un invitado con este email');

    const inviter = await this.usersRepository.findOne({ where: { id: dto.invitedById } });
    if (!inviter) throw new NotFoundException('El usuario que invita no existe');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newGuest = this.guestsRepository.create({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      countryCode: dto.countryCode,
      phone: dto.phone,
      typeCitizenID: dto.typeCitizenID,
      citizenID: dto.citizenID,
      invited_by: inviter,
    });

    const savedGuest = await this.saveAndReturnWithRelations(newGuest);
    await this.assignGuestPlan(savedGuest.id);
    return savedGuest;
  }

  private async findGuestWithRelations(id: string): Promise<Guest> {
    const guest = await this.guestsRepository.findOne({
      where: { id },
      relations: guestRelations
    })

    if (!guest) throw new NotFoundException('El invitado no existe')
    return guest
  }

  private async saveAndReturnWithRelations(guest: Guest): Promise<Guest> {
    const savedGuest = await this.guestsRepository.save(guest)
    return this.findGuestWithRelations(savedGuest.id)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Registro desde invitación
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registra un nuevo guest usando un token de invitación.
   *
   * Flujo:
   * 1. Valida el token (existe, no expirado, no usado) vía InvitesService
   * 2. Verifica que el citizenID no esté registrado como guest
   * 3. Hashea la contraseña
   * 4. Crea el guest asociado al usuario que invitó (invitedBy)
   * 5. Marca el token como usado
   */
  async registerFromInvite(dto: RegisterGuestDto): Promise<Guest> {
    // 1. Validar token — lanza excepciones si es inválido/expirado/usado
    const invite = await this.invitesService.validateAndGetInvite(dto.token);

    // 2. Verificar que el número de documento no esté ya registrado
    const existingGuest = await this.guestsRepository.findOne({
      where: { citizenID: dto.citizenID },
    });
    if (existingGuest) {
      throw new ConflictException('Ya existe un invitado con este número de documento');
    }

    // 3. Obtener el usuario que invitó (invitedBy viene cargado en la relación)
    const inviter = invite.invitedBy;
    if (!inviter) {
      throw new NotFoundException('El usuario que generó la invitación no existe');
    }

    // 4. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 5. Crear el guest
    const newGuest = this.guestsRepository.create({
      name: dto.name,
      lastName: dto.lastName,
      email: dto.email,
      password: hashedPassword,
      countryCode: dto.countryCode,
      phone: dto.phone,
      typeCitizenID: dto.typeCitizenID,
      citizenID: dto.citizenID,
      invited_by: inviter,
    });

    const savedGuest = await this.saveAndReturnWithRelations(newGuest);

    // 5b. Subscription del plan GUEST (capabilities del invitado en el motor de autorización)
    await this.assignGuestPlan(savedGuest.id);

    // 6. Marcar invitación como usada (después de crear guest exitosamente)
    await this.invitesService.markAsUsed(dto.token);

    // 7. Notificar en tiempo real al usuario invitante (si está conectado por WS)


    return savedGuest;
  }




  /**
   * Retorna los invitados del usuario logueado.
   * Si el usuario tiene rol ADMIN, retorna todos los invitados del sistema.
   */
  async findAllGuestsService(filterDto: GuestFilterDto, currentUser: JwtPayload) {
    const { limit, offset, search } = filterDto;
    const capabilityKeys = await this.authorizationService.getEffectiveCapabilityKeys({ userId: currentUser.id });
    const isAdmin = capabilityKeys.includes('platform.users.guests.manage');

    const qb = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.invited_by', 'invited_by')
      .orderBy('guest.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (!isAdmin) {
      qb.andWhere('invited_by.id = :userId', { userId: currentUser.id });
    }
    if (search) {
      qb.andWhere('(guest.name ILIKE :s OR guest.lastName ILIKE :s OR guest.email ILIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOneGuestsService(id: string) {
    return await this.findGuestWithRelations(id)
  }

  async updateGuestsService(id: string, updateGuestInput: UpdateGuestInput, currentUser: JwtPayload) {
    const existingGuest = await this.findGuestWithRelations(id)
    await this.assertCanManageGuest(existingGuest, currentUser);

    // password requiere hash explícito, nunca se persiste en texto plano.
    const { password, ...rest } = updateGuestInput;
    Object.assign(existingGuest, rest)
    if (password) {
      existingGuest.password = await bcrypt.hash(password, 10);
    }

    return await this.saveAndReturnWithRelations(existingGuest)
  }

  async removeGuestsService(id: string, currentUser: JwtPayload) {
    const guestToRemove = await this.findGuestWithRelations(id)
    await this.assertCanManageGuest(guestToRemove, currentUser);

    await this.guestsRepository.softRemove(guestToRemove)

    return guestToRemove
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Método de autenticación (usado exclusivamente por AuthService)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Busca un guest por citizenID incluyendo el campo password (select: false en la entidad).
   * Solo debe usarse durante el flujo de login — nunca exponer el resultado directamente.
   */
  async findGuestByCitizenIDForAuth(citizenID: string): Promise<Guest | null> {
    return this.guestsRepository.findOne({
      where: { citizenID },
      select: ['id', 'email', 'password', 'planType', 'name', 'lastName', 'citizenID'],
    });
  }
}

