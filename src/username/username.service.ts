import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class UsernameService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  /** Quita un '@' inicial (si el cliente lo envía por error) y espacios sobrantes. */
  normalize(raw: string): string {
    return raw.trim().replace(/^@/, '');
  }

  /**
   * Disponibilidad case-insensitive. Es solo un chequeo previo para dar
   * feedback rápido en la UI: la unicidad real la garantiza siempre el
   * índice único `UQ_users_username_lower` sobre `LOWER(username)` en la
   * base de datos, que hay que revalidar (capturando el error de Postgres)
   * al insertar/actualizar para cubrir condiciones de carrera.
   */
  async isAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const qb = this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', {
        username: this.normalize(username),
      });
    if (excludeUserId) {
      qb.andWhere('u.id != :excludeUserId', { excludeUserId });
    }
    const count = await qb.getCount();
    return count === 0;
  }
}
