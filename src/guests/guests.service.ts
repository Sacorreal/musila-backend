import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGuestInput } from './dto/create-guest.input';
import { RegisterFromInviteDto } from './dto/register-from-invite.dto';
import { UpdateGuestInput } from './dto/update-guest.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { InvitesService } from 'src/invites/invites.service';
import bcrypt from 'bcrypt';

const guestRelations: string[] = ['invited_by', 'playlists']

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private readonly guestsRepository: Repository<Guest>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
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
   * 2. Verifica que el email no esté registrado como guest
   * 3. Hashea la contraseña
   * 4. Crea el guest asociado al usuario que invitó (invitedBy)
   * 5. Marca el token como usado
   */
  async registerFromInvite(dto: RegisterFromInviteDto): Promise<Guest> {
    // 1. Validar token — lanza excepciones si es inválido/expirado/usado
    const invite = await this.invitesService.validateAndGetInvite(dto.token);

    // 2. Verificar que el email no esté ya registrado
    const existingGuest = await this.guestsRepository.findOne({
      where: { email: dto.email },
    });
    if (existingGuest) {
      throw new ConflictException('Ya existe un invitado con este correo electrónico');
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

    return savedGuest;
  }

  async createGuestsService(createGuestInput: CreateGuestInput):Promise<Guest> {
    const inviter = await this.usersRepository.findOne({
      where: { id: createGuestInput.invitedById }
    })

    if (!inviter) throw new NotFoundException('El usuario que invita no existe')

    const newGuest = this.guestsRepository.create({
      invited_by: inviter
    })

    return await this.saveAndReturnWithRelations(newGuest)

  }

  async findAllGuestsService(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const [data, total] = await this.guestsRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
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
}
