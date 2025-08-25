import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'guest' })
@ObjectType()
export class Guest {

    @PrimaryGeneratedColumn('uuid')
    @Field(() => ID)
    id: string

    @Column({ type: 'enum', enum: UserRole, default: UserRole.INVITADO })
    @Field(() => UserRole)
    role: UserRole

    @ManyToOne(() => User, (user) => user.guests, { nullable: false })
    @Field(() => User)
    invited_by: User

    @Field(() => [Playlist], { nullable: true })
    @ManyToMany(() => Playlist, playlist => playlist.guests)
    playlists?: Playlist[]
}
