import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity'

import {
    Entity,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { Message } from './message.entity'


@Entity({ name: 'chat' })
export class Chat {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => RequestedTrack)
    @JoinColumn()
    request: RequestedTrack;

    @OneToMany(() => Message, (m) => m.chat)
    messages?: Message[];

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;
}