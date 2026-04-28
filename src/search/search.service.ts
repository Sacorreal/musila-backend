import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { ILike, In, Raw, Repository } from 'typeorm';

@Injectable()
export class SearchService {
    constructor(
        @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
        @InjectRepository(MusicalGenre) private readonly musicalGenresRepository: Repository<MusicalGenre>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>
    ) { }

    async searchService(query: string) {
        if (!query || query.trim() === '') return { tracks: [], musicalGenres: [], authors: [] }

        try {
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
                        { genre: contains },
                        { subGenre: Raw(alias => `"${alias.replace('.', '"."')}"::text ILIKE :q`, { q: `%${query}%` }) }
                    ],
                    order: { genre: 'ASC' }
                }),

                this.usersRepository.find({
                    where: [
                        { role: In([UserRole.AUTOR, UserRole.CANTAUTOR]), name: startsWith },
                        { role: In([UserRole.AUTOR, UserRole.CANTAUTOR]), lastName: startsWith },
                        { role: In([UserRole.AUTOR, UserRole.CANTAUTOR]), name: contains },
                        { role: In([UserRole.AUTOR, UserRole.CANTAUTOR]), lastName: contains },
                        // Búsqueda por nombre completo (concatenando campos)
                        { 
                            role: In([UserRole.AUTOR, UserRole.CANTAUTOR]), 
                            name: Raw(alias => `CONCAT_WS(' ', "${alias.split('.')[0]}"."name", "${alias.split('.')[0]}"."second_name", "${alias.split('.')[0]}"."last_name", "${alias.split('.')[0]}"."last_second_name") ILIKE :q`, { q: `%${query}%` }) 
                        }
                    ],
                    order: { name: 'ASC' }
                })
            ])

            return { tracks, musicalGenres, authors }
        } catch (error) {
            console.error("[SearchService] Error during search:", error)
            throw error
        }
    }
}
