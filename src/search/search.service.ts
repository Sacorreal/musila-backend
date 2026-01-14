import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { ILike, Repository } from 'typeorm';

@Injectable()
export class SearchService {
    constructor(
        @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
        @InjectRepository(MusicalGenre) private readonly musicalGenresRepository: Repository<MusicalGenre>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>
    ) { }

    async searchService(query: string) {
        if (!query || query.trim() === '') return []

        const startsWith = ILike(`${query}%`)
        const contains = ILike(`%${query}%`)

        const [tracks, musicalGenres, authors] = await Promise.all([
            this.tracksRepository.find({
                where: [
                    { title: startsWith, isAvailable: true },
                    { title: contains, isAvailable: true }
                ],
                order: { title: 'ASC' }
            }),

            this.musicalGenresRepository.find({
                where: [
                    { genre: startsWith },
                    { genre: contains }
                ],
                order: { genre: 'ASC' }
            }),

            this.usersRepository.find({
                where: [
                    { role: UserRole.AUTOR, name: startsWith },
                    { role: UserRole.AUTOR, lastName: startsWith },
                    { role: UserRole.AUTOR, name: contains },
                    { role: UserRole.AUTOR, lastName: contains }
                ],
                order: { name: 'ASC' }
            })
        ])

        return { tracks, musicalGenres, authors }
    }
}
