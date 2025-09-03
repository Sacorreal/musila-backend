import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Playlist } from "src/playlists/entities/playlist.entity";
import { Repository } from "typeorm";
import { playlistsMock } from "./playlists.mock";
import { User } from "src/users/entities/user.entity";

@Injectable()
export class PlaylistsSeed {
    constructor(
        @InjectRepository(Playlist) private readonly playlistsRepository: Repository<Playlist>,
        @InjectRepository(User) private readonly usersRepository: Repository<User>) { }

    async seedPlaylists() {
        const users = await this.usersRepository.find();

        if (users.length === 0) {
            throw new Error('No hay usuarios en la base de datos, no se pueden asignar playlists')
        }

        for (const playlist of playlistsMock) {
            const existingPlaylist = await this.playlistsRepository.findOne({ where: { title: playlist.title } })

            if (!existingPlaylist) {

                const randomUser = users[Math.floor(Math.random() * users.length)]
                const newPlaylist = this.playlistsRepository.create({
                    ...playlist,
                    owner: randomUser
                })

                await this.playlistsRepository.save(newPlaylist)
            }
        }
    }
}   