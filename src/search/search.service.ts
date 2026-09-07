import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { TrackResponseDto } from 'src/tracks/dto/track-response.dto';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { User } from 'src/users/entities/user.entity';
import { ILike, In, Raw, Repository } from 'typeorm';
import { SearchAuthorDto, SearchResponseDto } from './dto/search-response.dto';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
        @InjectRepository(MusicalGenre) private readonly musicalGenresRepository: Repository<MusicalGenre>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>
    ) { }

    async searchService(dto: SearchQueryDto): Promise<SearchResponseDto> {
        const query = dto.q
        const take = Math.min(dto.limit ?? 20, 50)

        if (!query || query.trim() === '') {
            return {
                tracks: [],
                musicalGenres: [],
                authors: [],
                meta: {
                    limit: take,
                    tracksTotal: 0,
                    genresTotal: 0,
                    authorsTotal: 0,
                    hasMoreTracks: false,
                    hasMoreAuthors: false,
                    hasMoreGenres: false,
                },
            }
        }

        try {
            const startsWith = ILike(`${query}%`)
            const contains = ILike(`%${query}%`)

            const [[tracks, tracksTotal], [musicalGenres, genresTotal], [authors, authorsTotal]] = await Promise.all([
                this.tracksRepository.findAndCount({
                    where: [
                        { title: startsWith, isAvailable: true },
                        { title: contains, isAvailable: true }
                    ],
                    relations: ['authors'],
                    order: { title: 'ASC' },
                    take,
                }),

                this.musicalGenresRepository.findAndCount({
                    where: [
                        { genre: startsWith },
                        { genre: contains },
                        { ritmo: Raw(alias => `"${alias.replace('.', '"."')}"::text ILIKE :q`, { q: `%${query}%` }) }
                    ],
                    order: { genre: 'ASC' },
                    take,
                }),

                this.usersRepository.findAndCount({
                    where: [
                        { planType: In([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360]), name: startsWith },
                        { planType: In([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360]), lastName: startsWith },
                        { planType: In([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360]), name: contains },
                        { planType: In([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360]), lastName: contains },
                        // Búsqueda por nombre completo (concatenando campos)
                        {
                            planType: In([UserPlanType.PLAN_AUTOR, UserPlanType.PLAN_360]),
                            name: Raw(alias => `CONCAT_WS(' ', "${alias.split('.')[0]}"."name", "${alias.split('.')[0]}"."second_name", "${alias.split('.')[0]}"."last_name", "${alias.split('.')[0]}"."last_second_name") ILIKE :q`, { q: `%${query}%` })
                        }
                    ],
                    order: { name: 'ASC' },
                    take,
                })
            ])

            return {
                tracks: tracks.map((track) => TrackResponseDto.fromEntity(track)),
                musicalGenres,
                authors: authors.map((author) => SearchAuthorDto.fromUser(author)),
                meta: {
                    limit: take,
                    tracksTotal,
                    genresTotal,
                    authorsTotal,
                    hasMoreTracks: tracksTotal > take,
                    hasMoreAuthors: authorsTotal > take,
                    hasMoreGenres: genresTotal > take,
                },
            }
        } catch (error) {
            this.logger.error('Error durante búsqueda:', error)
            throw error
        }
    }
}
