import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGuestInput } from './dto/create-guest.input';
import { UpdateGuestInput } from './dto/update-guest.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

const guestRelations: string[] = ['invited_by', 'playlists']

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private readonly guestsRepository: Repository<Guest>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
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


  async createGuestsService(createGuestInput: CreateGuestInput) {
    const inviter = await this.usersRepository.findOne({
      where: { id: createGuestInput.invitedById }
    })

    if (!inviter) throw new NotFoundException('El usuario que invita no existe')

    const newGuest = this.guestsRepository.create({
      invited_by: inviter
    })

    return await this.saveAndReturnWithRelations(newGuest)

  }

  async findAllGuestsService() {
    return await this.guestsRepository.find()
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

    await this.guestsRepository.remove(guestToRemove)

    return guestToRemove
  }
}
