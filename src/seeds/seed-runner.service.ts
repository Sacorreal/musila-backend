import { Injectable, OnModuleInit } from "@nestjs/common";
import { MusicalGenreSeed } from "./musical-genre.ts/musical-genre.seed";
import { PlaylistsSeed } from "./playlists/playlists.seed";
import { TracksSeed } from "./tracks/tracks.seed";
import { UsersSeed } from "./users/users.seed";


function shouldSeed(env?: string): boolean {
    const allowed = ['local', 'development']
    return allowed.includes(env ?? '')
}

@Injectable()
export class SeedRunnerService implements OnModuleInit {
    constructor(
        private readonly usersSeed: UsersSeed,
        private readonly playlistsSeed: PlaylistsSeed,
        private readonly tracksSeed: TracksSeed,
        private readonly musicalGenreSeed: MusicalGenreSeed
    ) { }

    async onModuleInit() {

        const env = process.env.NODE_ENV


        if (shouldSeed(env)) {
            console.log(`Running seeds in ${env} mode...`)

            await this.usersSeed.seedUsers()
            console.log('Users seeded')

            /*await this.playlistsSeed.seedPlaylists()
            console.log('Playlists seeded')

            await this.musicalGenreSeed.seedMusicalGenre()
            console.log('Musical Genre seeded')

            await this.tracksSeed.seedTracks()
            console.log('Tracks seeded')
            */

        } else {
            console.log(`Seeds skipped (NODE_ENV=${env})`)
        }
    }
}
