import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { RegisterGuestDto } from './dto/register-guest.dto'
import { UpdateGuestInput } from './dto/update-guest.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { InvitesService } from 'src/invites/invites.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';

import bcrypt from 'bcrypt';

const guestRelations: string[] = ['invited_by', 'playlistCollaborations', 'chats']

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private readonly guestsRepository: Repository<Guest>,
    private readonly invitesService: InvitesService,

  ) { }

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

    // 6. Marcar invitación como usada (después de crear guest exitosamente)
    await this.invitesService.markAsUsed(dto.token);

    // 7. Notificar en tiempo real al usuario invitante (si está conectado por WS)


    return savedGuest;
  }




  /**
   * Retorna los invitados del usuario logueado.
   * Si el usuario tiene rol ADMIN, retorna todos los invitados del sistema.
   */
  async findAllGuestsService(paginationDto: PaginationDto, currentUser: JwtPayload) {
    const { limit, offset } = paginationDto;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    const [data, total] = await this.guestsRepository.findAndCount({
      where: isAdmin ? {} : { invited_by: { id: currentUser.id } },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
      relations: ['invited_by'],
    });

    return { data, total };
  }

  async findOneGuestsService(id: string) {
    return await this.findGuestWithRelations(id)
  }

  async updateGuestsService(id: string, updateGuestInput: UpdateGuestInput) {
    const existingGuest = await this.findGuestWithRelations(id)

    Object.assign(existingGuest, updateGuestInput)

    return await this.saveAndReturnWithRelations(existingGuest)
  }

  async removeGuestsService(id: string) {
    const guestToRemove = await this.findGuestWithRelations(id)

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
      select: ['id', 'email', 'password', 'role', 'name', 'lastName', 'citizenID'],
    });
  }
}

