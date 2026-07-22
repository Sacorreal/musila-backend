import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { generateMcid } from './utils/generate-mcid.util';

@Injectable()
export class CreatorIdService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async generateUnique(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateMcid();
      const exists = await this.usersRepository.exist({
        where: { musilaCreatorId: candidate },
      });
      if (!exists) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un Musila Creator ID único, intenta de nuevo',
    );
  }
}
