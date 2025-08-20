import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGuestInput } from './dto/create-guest.input';
import { UpdateGuestInput } from './dto/update-guest.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class GuestsService {
  constructor(
    @InjectRepository(Guest) private readonly guestsRepository: Repository<Guest>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) { }


  async createGuestsService(createGuestInput: CreateGuestInput) {
    const inviter = await this.usersRepository.findOne({ where: { id: createGuestInput.invitedById } })

    if (!inviter) throw new NotFoundException('El invitado no existe')

    const newGuest = this.guestsRepository.create({
      invited_by: inviter
    })

    return await this.guestsRepository.save(newGuest) 

  }

  async findAllGuestsService() {
    return await this.guestsRepository.find({relations: ['invited_by']})
  }

  async findOneGuestsService(id: string) {
    return await this.guestsRepository.findOne({ where: { id } })
  }

  async updateGuestsService(id: string, updateGuestInput: UpdateGuestInput) {
    const existingGuest = await this.guestsRepository.findOne({ where: { id } })

    if (!existingGuest) throw new NotFoundException('El invitado no existe')

    Object.assign(existingGuest, updateGuestInput)

    return await this.guestsRepository.save(existingGuest)
  }

  async removeGuestsService(id: string) {
    const guestToRemove = await this.guestsRepository.findOne({ where: { id } })

    if (!guestToRemove) throw new NotFoundException('El invitado no existe')

    await this.guestsRepository.remove(guestToRemove)

    return true
  }
}
