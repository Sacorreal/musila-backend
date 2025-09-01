import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Guest } from "src/guests/entities/guest.entity";
import { MusicalGenre } from "src/musical-genre/entities/musical-genre.entity";
import { Playlist } from "src/playlists/entities/playlist.entity";
import { RequestedTrack } from "src/requested-tracks/entities/requested-track.entity";
import { Track } from "src/tracks/entities/track.entity";
import { User } from "src/users/entities/user.entity";
import { UsersSeed } from "./users/users.seed";
import { PlaylistsSeed } from "./playlists/playlists.seed";
import { TracksSeed } from "./tracks/tracks.seed";
import { MusicalGenreSeed } from "./musical-genre.ts/musical-genre.seed";


@Module({
    imports: [TypeOrmModule.forFeature([User, Track, Guest, Playlist, RequestedTrack, MusicalGenre])],
    providers: [UsersSeed, PlaylistsSeed, TracksSeed, MusicalGenreSeed],
    exports: [UsersSeed, PlaylistsSeed, TracksSeed, MusicalGenreSeed]
})

export class SeedsModule { }