import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Track } from "src/tracks/entities/track.entity";
import { Repository } from "typeorm";
import { tracksMock } from "./tracks.mock";
import { MusicalGenre } from "src/musical-genre/entities/musical-genre.entity";
import { User } from "src/users/entities/user.entity";

@Injectable()
export class TracksSeed {
    constructor(
        @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
        @InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>,
    ) { }

    async seedTracks() {

        const genres = await this.musicalGenreRepository.find()
        const users = await this.usersRepository.find()

        if (genres.length === 0) {
            throw new Error('No hay generos musicales en la base de datos, no se pueden asignar tracks')
        }

        if (users.length === 0) {
            throw new Error('No se encontraron usuarios en la base de datos')
        }


        for (const track of tracksMock) {
            const existingTrack = await this.tracksRepository.findOne({ where: { title: track.title }, withDeleted: true });

            if (!existingTrack) {

                const randomAuthors = users
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.floor(Math.random() * 3) + 1)

                const randomGenre = genres[Math.floor(Math.random() * genres.length)]
                const newTrack = this.tracksRepository.create({
                    ...track,
                    genre: randomGenre,
                    authors: randomAuthors
                    
                })
                await this.tracksRepository.save(newTrack)

            }
        }


    }
}