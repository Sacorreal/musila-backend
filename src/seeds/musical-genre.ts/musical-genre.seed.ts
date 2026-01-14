import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';

import { Repository } from 'typeorm';
import { musicalGenresMock } from './musical-genre.mock';



@Injectable()
export class MusicalGenreSeed {
    constructor(
        @InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>
    ) { }

    async seedMusicalGenre() {

        for (const musicalGenre of musicalGenresMock) {

            const existingMusicalGenre = await this.musicalGenreRepository.findOne({ where: { genre: musicalGenre.genre }, withDeleted: true });

            if (!existingMusicalGenre) {
                const newMusicalGenre = this.musicalGenreRepository.create(musicalGenre)

                await this.musicalGenreRepository.save(newMusicalGenre)
            }
        }

    }
}